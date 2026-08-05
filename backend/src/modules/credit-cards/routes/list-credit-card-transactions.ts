import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idParamSchema,
  monthQuerySchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { transactionResponseSchema } from "../../transactions/schemas.ts";
import { serializeTransaction } from "../../transactions/serialize.ts";
import {
  closingDateForCycleMonth,
  previousClosingDate,
} from "../billing-cycle.ts";

/** Transactions charged to this card within one billing cycle (not a calendar month, despite the `month` query key — it's the cycle's `cycleMonth`). */
export async function listCreditCardTransactions(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/credit-cards/:id/transactions",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["credit-cards"],
        summary: "List a card's transactions for one billing cycle",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        querystring: monthQuerySchema,
        response: {
          200: z.array(transactionResponseSchema),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { month } = request.query;

      const card = await prisma.creditCard.findFirst({
        where: { id, userId: request.user.sub },
      });
      if (!card) {
        return reply.status(404).send({ message: "credit card not found" });
      }

      const closingDate = closingDateForCycleMonth(card.closingDay, month);
      const start = previousClosingDate(closingDate);

      const transactions = await prisma.transaction.findMany({
        where: {
          creditCardId: card.id,
          date: { gt: start, lte: closingDate },
        },
        orderBy: { date: "desc" },
      });

      return reply.status(200).send(transactions.map(serializeTransaction));
    },
  );
}
