import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  closingDateForCycleMonth,
  previousClosingDate,
} from "../../lib/billing-cycle.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeTransaction } from "../../lib/serialize-transaction.ts";

const paramsSchema = z.object({ id: z.uuid() });
const querySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function listCreditCardTransactions(app: FastifyInstance) {
  app.get(
    "/credit-cards/:id/transactions",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { id } = paramsSchema.parse(request.params);
      const { month } = querySchema.parse(request.query);

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
