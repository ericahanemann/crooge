import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { meResponseSchema } from "../schemas.ts";

/** Returns the authenticated user's own profile. */
export async function getMe(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Get the current user",
        security: [{ bearerAuth: [] }],
        response: {
          200: meResponseSchema,
          404: errorResponseSchema.describe(
            "The token's subject no longer maps to a real user (e.g. deleted after the token was issued).",
          ),
        },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { id: true, name: true, email: true },
      });
      if (!user) {
        return reply.status(404).send({ message: "user not found" });
      }

      return reply.status(200).send(user);
    },
  );
}
