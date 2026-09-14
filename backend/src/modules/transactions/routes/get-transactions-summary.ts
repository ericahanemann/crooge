import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { monthQuerySchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { materializeOverdueBills } from "../../credit-cards/materialize-bill-transaction.ts";
import { materializeRecurringOccurrences } from "../materialize-recurring-occurrences.ts";
import { monthRange } from "../month-range.ts";

const summaryResponseSchema = z
  .object({
    balance: z
      .number()
      .describe(
        "This month's net (income − expenses) across all non-card transactions — resets every month, same date range as income/spent. Not a carried-forward running total.",
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
    "A card purchase itself is excluded from all three fields: it hits the card's bill, not the account balance. Once the bill's due date arrives (or it's paid early), the bill materializes into a real, read-only, non-card Transaction — see `credit-cards/materialize-bill-transaction.ts` — and from that point on IS counted here like any other expense.",
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

      await materializeOverdueBills(userId);
      await materializeRecurringOccurrences(userId, start, end);

      const [monthIncome, monthExpense] = await Promise.all([
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
      ]);

      const income = Number(monthIncome._sum.amount ?? 0);
      const spent = Number(monthExpense._sum.amount ?? 0);
      const balance = income - spent;

      return reply.status(200).send({ balance, income, spent });
    },
  );
}
