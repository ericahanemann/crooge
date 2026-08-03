import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ensureBill } from "../../lib/billing-cycle.ts";
import {
  generateInstallments,
  generateRecurring,
  type Occurrence,
} from "../../lib/generate-occurrences.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeTransaction } from "../../lib/serialize-transaction.ts";

const incomeBodySchema = z.object({
  type: z.literal("income"),
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  date: z.iso.date(),
  category: z.string().trim().min(1),
});

const expenseBodySchema = z.object({
  type: z.literal("expense"),
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  date: z.iso.date(),
  category: z.string().trim().min(1),
  paymentMethod: z.enum(["debit_pix", "credit"]),
  creditCardId: z.uuid().optional(),
  timing: z.enum(["one_time", "installments", "recurring"]).default("one_time"),
  installments: z.number().int().min(2).optional(),
  frequency: z.enum(["monthly", "annual"]).optional(),
});

const createTransactionBodySchema = z
  .discriminatedUnion("type", [incomeBodySchema, expenseBodySchema])
  .superRefine((data, ctx) => {
    if (data.type !== "expense") return;
    if (data.paymentMethod === "credit" && !data.creditCardId) {
      ctx.addIssue({
        code: "custom",
        path: ["creditCardId"],
        message: "required when paymentMethod is credit",
      });
    }
    if (
      data.timing === "installments" &&
      (data.installments === undefined || data.installments < 2)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["installments"],
        message: "must be at least 2",
      });
    }
    if (data.timing === "recurring" && !data.frequency) {
      ctx.addIssue({
        code: "custom",
        path: ["frequency"],
        message: "required when timing is recurring",
      });
    }
  });

export async function createTransaction(app: FastifyInstance) {
  app.post(
    "/transactions",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = createTransactionBodySchema.parse(request.body);
      const userId = request.user.sub;
      const startDate = new Date(body.date);

      if (body.type === "income") {
        const transaction = await prisma.transaction.create({
          data: {
            userId,
            type: "INCOME",
            category: body.category,
            description: body.description,
            amount: body.amount,
            date: startDate,
            timing: "ONE_TIME",
          },
        });

        return reply.status(201).send([serializeTransaction(transaction)]);
      }

      let card: { closingDay: number; dueDay: number } | null = null;
      if (body.paymentMethod === "credit") {
        card = await prisma.creditCard.findFirst({
          where: { id: body.creditCardId, userId },
          select: { closingDay: true, dueDay: true },
        });
        if (!card) {
          return reply.status(404).send({ message: "credit card not found" });
        }
      }

      let occurrences: Occurrence[];
      let groupId: string | undefined;

      if (body.timing === "installments" && body.installments !== undefined) {
        const generated = generateInstallments(
          body.amount,
          body.installments,
          startDate,
        );
        occurrences = generated.occurrences;
        groupId = generated.groupId;
      } else if (body.timing === "recurring") {
        const generated = generateRecurring(
          body.amount,
          body.frequency === "monthly" ? "MONTHLY" : "ANNUAL",
          startDate,
        );
        occurrences = generated.occurrences;
        groupId = generated.groupId;
      } else {
        occurrences = [{ date: startDate, amount: body.amount }];
      }

      const timing =
        body.timing === "installments"
          ? ("INSTALLMENT" as const)
          : body.timing === "recurring"
            ? ("RECURRING" as const)
            : ("ONE_TIME" as const);

      const created = await prisma.$transaction(async (tx) => {
        const rows = [];
        for (const occurrence of occurrences) {
          if (body.paymentMethod === "credit" && body.creditCardId && card) {
            await ensureBill(
              tx,
              body.creditCardId,
              card.closingDay,
              card.dueDay,
              occurrence.date,
            );
          }

          const row = await tx.transaction.create({
            data: {
              userId,
              type: "EXPENSE",
              category: body.category,
              description: body.description,
              amount: occurrence.amount,
              date: occurrence.date,
              timing,
              paymentMethod:
                body.paymentMethod === "credit" ? "CREDIT" : "DEBIT_PIX",
              frequency:
                body.timing === "recurring"
                  ? body.frequency === "monthly"
                    ? "MONTHLY"
                    : "ANNUAL"
                  : undefined,
              installmentCurrent: occurrence.installmentCurrent,
              installmentTotal: occurrence.installmentTotal,
              groupId,
              creditCardId:
                body.paymentMethod === "credit" ? body.creditCardId : undefined,
            },
          });
          rows.push(row);
        }
        return rows;
      });

      return reply.status(201).send(created.map(serializeTransaction));
    },
  );
}
