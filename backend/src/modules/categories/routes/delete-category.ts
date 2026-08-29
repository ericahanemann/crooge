import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";

/**
 * Deletes a category. The seeded "Other" category (`isFallback`) can't be
 * deleted — it's the reassignment target below, and without it there'd be
 * nothing to fall back to. Backend-managed categories (`isSystem`, e.g. the
 * "Credit Card Bill" category materialized bill transactions use) can't be
 * deleted either — deleting it wouldn't stop those transactions from
 * existing, just orphan their category reference.
 *
 * Any transactions still using the deleted category are reassigned to the
 * caller's `isFallback` category for that kind. Accounts with no fallback
 * (created before per-account category seeding existed) skip the
 * reassignment — their affected transactions keep pointing at the deleted
 * id, and the frontend renders a generic "unknown category" for those.
 */
export async function deleteCategory(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/categories/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["categories"],
        summary: "Delete a category",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        response: {
          204: z.void().describe("Deleted."),
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "Can't delete the default (isFallback) category.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user.sub;

      const existing = await prisma.category.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        return reply.status(404).send({ message: "category not found" });
      }
      if (existing.isFallback) {
        return reply
          .status(409)
          .send({ message: "can't delete the default category" });
      }
      if (existing.isSystem) {
        return reply
          .status(409)
          .send({ message: "can't delete a system category" });
      }

      const fallback = await prisma.category.findFirst({
        where: { userId, kind: existing.kind, isFallback: true },
      });

      await prisma.$transaction([
        ...(fallback
          ? [
              prisma.transaction.updateMany({
                where: { userId, category: id },
                data: { category: fallback.id },
              }),
            ]
          : []),
        prisma.category.delete({ where: { id } }),
      ]);

      return reply.status(204).send();
    },
  );
}
