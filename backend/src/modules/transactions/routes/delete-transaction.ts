import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";

/**
 * Deletes a transaction. A one-time row just deletes itself. An
 * installment/recurring occurrence instead cancels the series from that
 * occurrence's date forward (inclusive) — every other row sharing its
 * `groupId` dated on or after it is deleted too, while earlier occurrences
 * stay as history. A row materialized from a credit card bill
 * (`creditCardBillId` set) can't be deleted at all — it's a side effect of
 * the bill, not a transaction the user filed directly.
 */
export async function deleteTransaction(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/transactions/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["transactions"],
        summary: "Delete a transaction",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          204: z
            .void()
            .describe(
              "Deleted. For a series, every occurrence from this one forward is gone.",
            ),
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "Can't delete a bill-materialized transaction.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
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
          .send({ message: "can't delete a bill-materialized transaction" });
      }

      if (existing.timing === "ONE_TIME" || !existing.groupId) {
        await prisma.transaction.delete({ where: { id } });
      } else {
        await prisma.transaction.deleteMany({
          where: {
            userId,
            groupId: existing.groupId,
            date: { gte: existing.date },
          },
        });
      }

      return reply.status(204).send();
    },
  );
}
