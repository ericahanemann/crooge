import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { CreditCard } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../../credit-cards/bill.ts";
import { ensureBill } from "../../credit-cards/billing-cycle.ts";
import {
  generateInstallments,
  generateRecurring,
  type Occurrence,
} from "../generate-occurrences.ts";
import { transactionResponseSchema } from "../schemas.ts";
import { serializeTransaction } from "../serialize.ts";

const incomeBodySchema = z.object({
  type: z.literal("income"),
  description: z.string().trim().min(1),
  amount: z
    .number()
    .positive()
    .describe("Always positive; sign is implied by `type`."),
  date: z.iso.date(),
  category: z.string().trim().min(1),
});

const expenseBodySchema = z.object({
  type: z.literal("expense"),
  description: z.string().trim().min(1),
  amount: z
    .number()
    .positive()
    .describe(
      "Always positive. For installments, this is the *total* purchase amount — it gets split across `installments` occurrences.",
    ),
  date: z.iso.date().describe("Date of the first (or only) occurrence."),
  category: z.string().trim().min(1),
  paymentMethod: z.enum(["debit_pix", "credit"]),
  creditCardId: z
    .uuid()
    .optional()
    .describe(
      'Required, and must belong to the caller, when paymentMethod is "credit".',
    ),
  timing: z.enum(["one_time", "installments", "recurring"]).default("one_time"),
  installments: z
    .number()
    .int()
    .min(2)
    .optional()
    .describe(
      'Number of installments. Required when timing is "installments".',
    ),
  frequency: z
    .enum(["monthly", "annual"])
    .optional()
    .describe(
      'Required when timing is "recurring". Materializes 12 occurrences for "monthly", 3 for "annual".',
    ),
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
  })
  .describe(
    "Either an income (always one-time) or an expense (one-time, installment, or recurring; debit/pix or credit). " +
      "Installment and recurring expenses materialize one Transaction row per occurrence immediately — see " +
      "`backend/README.md` for why there's no virtual projection or cron job.",
  );

/**
 * Creates a transaction. For income, or a one-time expense, this creates
 * exactly one row. For an installment or recurring expense it creates one
 * row per occurrence (see `generate-occurrences.ts`), all sharing a
 * `groupId`; every occurrence charged to a credit card also gets its
 * billing-cycle `CreditCardBill` row ensured to exist via
 * `modules/credit-cards/billing-cycle.ts#ensureBill`.
 */
export async function createTransaction(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/transactions",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "Create a transaction",
        security: [{ bearerAuth: [] }],
        body: createTransactionBodySchema,
        response: {
          201: z
            .array(transactionResponseSchema)
            .describe(
              "The created row(s) — more than one for installment/recurring expenses.",
            ),
          404: errorResponseSchema.describe(
            "creditCardId doesn't exist or doesn't belong to the caller.",
          ),
          422: errorResponseSchema.describe(
            "The purchase's total amount exceeds the card's currently available credit.",
          ),
        },
      },
    },
    async (request, reply) => {
      const body = request.body;
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

      let card: Pick<
        CreditCard,
        "id" | "limit" | "closingDay" | "dueDay"
      > | null = null;
      if (body.paymentMethod === "credit") {
        card = await prisma.creditCard.findFirst({
          where: { id: body.creditCardId, userId },
          select: { id: true, limit: true, closingDay: true, dueDay: true },
        });
        if (!card) {
          return reply.status(404).send({ message: "credit card not found" });
        }

        const available = await getAvailableCredit(card);
        if (body.amount > available) {
          return reply
            .status(422)
            .send({ message: "purchase exceeds available credit" });
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
