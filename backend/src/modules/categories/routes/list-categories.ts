import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.ts";
import {
  categoryKindSchema,
  categoryResponseSchema,
  KIND_TO_DB,
} from "../schemas.ts";
import { serializeCategory } from "../serialize.ts";

const querySchema = z.object({
  kind: categoryKindSchema
    .optional()
    .describe("Filter to just expense or income categories. Omit for both."),
});

/** Lists the caller's custom categories, oldest first. */
export async function listCategories(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/categories",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["categories"],
        summary: "List custom categories",
        security: [{ bearerAuth: [] }],
        querystring: querySchema,
        response: { 200: z.array(categoryResponseSchema) },
      },
    },
    async (request, reply) => {
      const { kind } = request.query;

      const categories = await prisma.category.findMany({
        where: {
          userId: request.user.sub,
          ...(kind ? { kind: KIND_TO_DB[kind] } : {}),
        },
        orderBy: { createdAt: "asc" },
      });

      return reply.status(200).send(categories.map(serializeCategory));
    },
  );
}
