import type { FastifyReply, FastifyRequest } from "fastify";

/** `onRequest` hook for every protected route: verifies the JWT and populates `request.user`, or short-circuits with 401. */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "unauthorized" });
  }
}
