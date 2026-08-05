import type { FastifyReply, FastifyRequest } from "fastify";

// Ambient module augmentation so `app.authenticate` and `request.user` are
// typed everywhere without every route re-declaring them.
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}
