import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "../../../lib/prisma.ts";
import { materializeOverdueBills } from "../../credit-cards/materialize-bill-transaction.ts";
import { materializeRecurringOccurrences } from "../materialize-recurring-occurrences.ts";
import { monthRange } from "../month-range.ts";
import {
  listTransactionsQuerySchema,
  transactionsPageResponseSchema,
} from "../schemas.ts";
import { serializeTransaction } from "../serialize.ts";

/**
 * Lists a page of the caller's transactions (account + credit card) for one
 * calendar month, newest first. `search`/`category` filter within that same
 * month — scoped the same way the UI's search box already was, just moved
 * server-side so it no longer requires shipping the whole month to the
 * browser. `categories` in the response ignores the current filter (always
 * every category used this month) so the filter dropdown doesn't shrink as
 * you narrow the list.
 */
export async function listTransactions(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/transactions",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "List a month's transactions",
        security: [{ bearerAuth: [] }],
        querystring: listTransactionsQuerySchema,
        response: { 200: transactionsPageResponseSchema },
      },
    },
    async (request, reply) => {
      const { month, page, pageSize, search, category } = request.query;
      const { start, end } = monthRange(month);
      const userId = request.user.sub;

      await materializeOverdueBills(userId);
      await materializeRecurringOccurrences(userId, start, end);

      const monthRangeWhere = { userId, date: { gte: start, lt: end } };
      const where = {
        ...monthRangeWhere,
        ...(category ? { category } : {}),
        ...(search
          ? {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      };

      const [transactions, total, categoryRows] = await Promise.all([
        prisma.transaction.findMany({
          where,
          // `date` alone isn't unique — a tiebreaker keeps page boundaries
          // stable across requests instead of rows shifting between pages.
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.transaction.count({ where }),
        prisma.transaction.findMany({
          where: monthRangeWhere,
          distinct: ["category"],
          select: { category: true },
        }),
      ]);

      return reply.status(200).send({
        items: transactions.map(serializeTransaction),
        total,
        page,
        pageSize,
        categories: categoryRows.map((row) => row.category),
      });
    },
  );
}
