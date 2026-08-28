import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import {
  errorResponseSchema,
  idParamSchema,
} from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { categoryResponseSchema, iconKeySchema } from "../schemas.ts";
import { serializeCategory } from "../serialize.ts";

const bodySchema = z.object({
  label: z.string().trim().min(1),
  icon: iconKeySchema,
});

/** Renames/re-icons a category (including seeded ones). `kind`/`isFallback` are immutable. */
export async function updateCategory(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/categories/:id",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["categories"],
        summary: "Rename or re-icon a category",
        security: [{ bearerAuth: [] }],
        params: idParamSchema,
        body: bodySchema,
        response: {
          200: categoryResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "A category with this label already exists for this kind.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { label, icon } = request.body;
      const userId = request.user.sub;

      const existing = await prisma.category.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        return reply.status(404).send({ message: "category not found" });
      }

      try {
        const category = await prisma.category.update({
          where: { id },
          data: { label, icon },
        });

        return reply.status(200).send(serializeCategory(category));
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return reply.status(409).send({ message: "category already exists" });
        }

        throw error;
      }
    },
  );
}
