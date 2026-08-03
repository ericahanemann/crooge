import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { monthRange } from "../../lib/month-range.ts";
import { prisma } from "../../lib/prisma.ts";

const summaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export async function getTransactionsSummary(app: FastifyInstance) {
  app.get(
    "/transactions/summary",
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const { month } = summaryQuerySchema.parse(request.query);
      const userId = request.user.sub;
      const { start, end } = monthRange(month);

      // `balance` is a running total as of now (not month-scoped); `income`/
      // `spent` are scoped to the requested month. Only non-card
      // transactions count — credit card spend hits the card's bill, not
      // the account balance.
      const [monthIncome, monthExpense, allIncome, allExpense] =
        await Promise.all([
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              userId,
              creditCardId: null,
              type: "INCOME",
              date: { gte: start, lt: end },
            },
          }),
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: {
              userId,
              creditCardId: null,
              type: "EXPENSE",
              date: { gte: start, lt: end },
            },
          }),
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId, creditCardId: null, type: "INCOME" },
          }),
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { userId, creditCardId: null, type: "EXPENSE" },
          }),
        ]);

      const income = Number(monthIncome._sum.amount ?? 0);
      const spent = Number(monthExpense._sum.amount ?? 0);
      const balance =
        Number(allIncome._sum.amount ?? 0) -
        Number(allExpense._sum.amount ?? 0);

      return reply.status(200).send({ balance, income, spent });
    },
  );
}
