import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { monthRange } from "../../lib/month-range.ts";
import { prisma } from "../../lib/prisma.ts";
import { serializeTransaction } from "../../lib/serialize-transaction.ts";

const listTransactionsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function listTransactions(app: FastifyInstance) {
  app.get(
    "/transactions",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { month } = listTransactionsQuerySchema.parse(request.query);
      const { start, end } = monthRange(month);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: request.user.sub,
          date: { gte: start, lt: end },
        },
        orderBy: { date: "desc" },
      });

      return reply.status(200).send(transactions.map(serializeTransaction));
    },
  );
}
