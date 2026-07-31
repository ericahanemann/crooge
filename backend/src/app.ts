import fastify from "fastify";
import { z } from "zod";
import { registerUser } from "./http/routes/register-user.ts";

export const app = fastify();

app.register(registerUser);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      message: "validation error",
      issues: z.flattenError(error).fieldErrors,
    });
  }

  app.log.error(error);

  return reply.status(500).send({ message: "internal server error" });
});
