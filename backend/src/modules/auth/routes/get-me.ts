import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
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
        response: { 200: meResponseSchema },
      },
    },
    async (request, reply) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: request.user.sub },
        select: { id: true, name: true, email: true },
      });

      return reply.status(200).send(user);
    },
  );
}
