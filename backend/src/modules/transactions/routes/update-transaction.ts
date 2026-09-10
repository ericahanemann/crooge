import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { CreditCard } from "../../../generated/prisma/client.ts";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { getAvailableCredit } from "../../credit-cards/bill.ts";
import { ensureBill } from "../../credit-cards/billing-cycle.ts";
import {
  transactionResponseSchema,
  updateTransactionBodySchema,
} from "../schemas.ts";
import { serializeTransaction } from "../serialize.ts";

class CreditLimitExceededError extends Error {}

/**
 * Edits a transaction. See `updateTransactionBodySchema` for exactly what's
 * accepted depending on the target row (one-time vs. series vs.
 * bill-materialized).
 *
 * Switching an expense onto/off a credit card (or changing its amount/date
 * while on one) re-validates available credit the same way creation does,
 * but by recomputing *after* applying the change inside the DB transaction
 * and rolling back if it went negative — simpler than trying to subtract
 * out this row's own prior contribution before checking.
 */
export async function updateTransaction(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/transactions/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "Update a transaction",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: updateTransactionBodySchema,
        response: {
          200: transactionResponseSchema,
          404: errorResponseSchema.describe(
            "Transaction not found, or creditCardId doesn't exist/belong to the caller.",
          ),
          409: errorResponseSchema.describe(
            "A locked field was sent for an installment/recurring occurrence, or the row is read-only (bill-materialized).",
          ),
          422: errorResponseSchema.describe(
            "The resulting amount/card combination exceeds available credit, or creditCardId is missing while paymentMethod resolves to credit.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;
      const userId = request.user.sub;

      const existing = await prisma.transaction.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        return reply.status(404).send({ message: "transaction not found" });
      }
      if (existing.creditCardBillId) {
        return reply
          .status(409)
          .send({ message: "can't edit a bill-materialized transaction" });
      }

      const isExpense = existing.type === "EXPENSE";
      const isSeries = existing.timing !== "ONE_TIME";

      if (isSeries) {
        const lockedFieldSent =
          body.amount !== undefined ||
          body.date !== undefined ||
          body.paymentMethod !== undefined ||
          body.creditCardId !== undefined;
        if (lockedFieldSent) {
          return reply.status(409).send({
            message:
              "only description/category can be edited on an installment or recurring transaction",
          });
        }
      }
      if (
        !isExpense &&
        (body.paymentMethod !== undefined || body.creditCardId !== undefined)
      ) {
        return reply.status(409).send({
          message: "paymentMethod/creditCardId only apply to expenses",
        });
      }

      let targetPaymentMethod = existing.paymentMethod;
      let targetCreditCardId = existing.creditCardId;

      if (isExpense && body.paymentMethod !== undefined) {
        targetPaymentMethod =
          body.paymentMethod === "credit" ? "CREDIT" : "DEBIT_PIX";
      }
      if (isExpense && body.creditCardId !== undefined) {
        targetCreditCardId = body.creditCardId;
      }
      if (isExpense && targetPaymentMethod === "DEBIT_PIX") {
        targetCreditCardId = null;
      }
      if (
        isExpense &&
        targetPaymentMethod === "CREDIT" &&
        !targetCreditCardId
      ) {
        return reply.status(422).send({
          message: "creditCardId required when paymentMethod is credit",
        });
      }

      const targetDate = body.date ? new Date(body.date) : existing.date;

      let card: Pick<
        CreditCard,
        "id" | "limit" | "closingDay" | "dueDay"
      > | null = null;
      if (isExpense && targetPaymentMethod === "CREDIT" && targetCreditCardId) {
        card = await prisma.creditCard.findFirst({
          where: { id: targetCreditCardId, userId, archivedAt: null },
          select: { id: true, limit: true, closingDay: true, dueDay: true },
        });
        if (!card) {
          return reply.status(404).send({ message: "credit card not found" });
        }
      }

      try {
        const updated = await prisma.$transaction(async (tx) => {
          if (card) {
            await ensureBill(
              tx,
              card.id,
              card.closingDay,
              card.dueDay,
              targetDate,
            );
          }

          const row = await tx.transaction.update({
            where: { id },
            data: {
              description: body.description ?? undefined,
              amount: body.amount ?? undefined,
              date: targetDate,
              category: body.category ?? undefined,
              paymentMethod: isExpense ? targetPaymentMethod : undefined,
              creditCardId: isExpense ? targetCreditCardId : undefined,
            },
          });

          if (card) {
            const available = await getAvailableCredit(card, tx);
            if (available < 0) throw new CreditLimitExceededError();
          }

          return row;
        });

        return reply.status(200).send(serializeTransaction(updated));
      } catch (error) {
        if (error instanceof CreditLimitExceededError) {
          return reply
            .status(422)
            .send({ message: "purchase exceeds available credit" });
        }
        throw error;
      }
    },
  );
}
