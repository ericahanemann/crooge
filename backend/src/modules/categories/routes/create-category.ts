import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  categoryKindSchema,
  categoryResponseSchema,
  iconKeySchema,
  KIND_TO_DB,
} from "../schemas.ts";
import { serializeCategory } from "../serialize.ts";

const bodySchema = z.object({
  kind: categoryKindSchema,
  label: z.string().trim().min(1),
  icon: iconKeySchema,
});

/**
 * Creates a category. `kind` can't be changed later — editing only renames
 * `label`/`icon`. `isFallback` is never set here — it's only ever true for
 * the "Other" category seeded at signup (see `auth/routes/register-user.ts`).
 */
export async function createCategory(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/categories",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["categories"],
        summary: "Create a category",
        security: [{ bearerAuth: [] }],
        body: bodySchema,
        response: {
          201: categoryResponseSchema,
          409: errorResponseSchema.describe(
            "A category with this label already exists for this kind.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { kind, label, icon } = request.body;
      const userId = request.user.sub;

      try {
        const category = await prisma.category.create({
          data: { userId, kind: KIND_TO_DB[kind], label, icon },
        });

        return reply.status(201).send(serializeCategory(category));
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
