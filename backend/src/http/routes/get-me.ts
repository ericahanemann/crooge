import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.ts";

export async function getMe(app: FastifyInstance) {
  app.get("/me", { onRequest: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      select: { id: true, name: true, email: true },
    });

    return reply.status(200).send(user);
  });
}
