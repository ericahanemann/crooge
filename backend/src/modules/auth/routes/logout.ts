import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { prisma } from "../../../lib/prisma.ts";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
} from "../constants.ts";
import { hashToken } from "../tokens.ts";

const logoutBodySchema = z
  .object({
    refreshToken: z
      .string()
      .optional()
      .describe(
        "Only needed if the client isn't sending the refresh-token cookie.",
      ),
  })
  .default({});

/** Revokes the presented refresh token (idempotent — a missing/unknown token is not an error) and clears the cookie. */
export async function logout(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/sessions",
    {
      schema: {
        tags: ["auth"],
        summary: "Sign out",
        body: logoutBodySchema,
      },
    },
    async (request, reply) => {
      const { refreshToken: bodyToken } = request.body;
      const presentedToken =
        request.cookies[REFRESH_TOKEN_COOKIE_NAME] ?? bodyToken;

      if (presentedToken) {
        await prisma.refreshToken.updateMany({
          where: { tokenHash: hashToken(presentedToken), revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        path: REFRESH_TOKEN_COOKIE_PATH,
      });

      return reply.status(204).send();
    },
  );
}
