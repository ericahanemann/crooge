import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { monthQuerySchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { materializeOverdueBills } from "../../credit-cards/materialize-bill-transaction.ts";
import { monthRange } from "../month-range.ts";
import { transactionResponseSchema } from "../schemas.ts";
import { serializeTransaction } from "../serialize.ts";

/** Lists the caller's transactions (account + credit card) for one calendar month, newest first. */
export async function listTransactions(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/transactions",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "List a month's transactions",
        security: [{ bearerAuth: [] }],
        querystring: monthQuerySchema,
        response: { 200: z.array(transactionResponseSchema) },
      },
    },
    async (request, reply) => {
      const { month } = request.query;
      const { start, end } = monthRange(month);

      await materializeOverdueBills(request.user.sub);

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
