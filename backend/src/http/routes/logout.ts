import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
} from "../../lib/auth-constants.ts";
import { prisma } from "../../lib/prisma.ts";
import { hashToken } from "../../lib/tokens.ts";

const logoutBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export async function logout(app: FastifyInstance) {
  app.delete("/sessions", async (request, reply) => {
    const { refreshToken: bodyToken } = logoutBodySchema.parse(
      request.body ?? {},
    );
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
  });
}
