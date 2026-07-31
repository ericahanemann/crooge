import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import fastify from "fastify";
import { z } from "zod";
import { env } from "./env/index.ts";
import { authenticate } from "./http/hooks/authenticate.ts";
import { authenticateSession } from "./http/routes/authenticate-session.ts";
import { getMe } from "./http/routes/get-me.ts";
import { logout } from "./http/routes/logout.ts";
import { refreshSession } from "./http/routes/refresh-session.ts";
import { registerUser } from "./http/routes/register-user.ts";

export const app = fastify();

app.register(cors, { origin: env.FRONTEND_URL, credentials: true });
app.register(cookie);
app.register(jwt, { secret: env.JWT_SECRET });

app.decorate("authenticate", authenticate);

app.register(registerUser);
app.register(authenticateSession);
app.register(refreshSession);
app.register(logout);
app.register(getMe);

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
