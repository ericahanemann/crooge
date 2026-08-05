import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { monthQuerySchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { monthRange } from "../month-range.ts";

const summaryResponseSchema = z
  .object({
    balance: z
      .number()
      .describe(
        "Running total as of now across all non-card transactions (not scoped to the requested month) — there's no separate Account model, so this is always SUM(amount).",
      ),
    income: z
      .number()
      .describe(
        "Sum of the requested month's income, excluding credit card transactions.",
      ),
    spent: z
      .number()
      .describe(
        "Sum of the requested month's expenses, excluding credit card transactions.",
      ),
  })
  .describe(
    "Credit card spend is intentionally excluded from all three fields: it hits the card's bill, not the account balance, until the bill is paid.",
  );

/** Balance + this month's income/spent, for the Monthly page's summary cards. */
export async function getTransactionsSummary(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/transactions/summary",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "Get a month's balance/income/spent summary",
        security: [{ bearerAuth: [] }],
        querystring: monthQuerySchema,
        response: { 200: summaryResponseSchema },
      },
    },
    async (request, reply) => {
      const { month } = request.query;
      const userId = request.user.sub;
      const { start, end } = monthRange(month);

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
