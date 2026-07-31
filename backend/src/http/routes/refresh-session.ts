import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "../../lib/auth-constants.ts";
import { prisma } from "../../lib/prisma.ts";
import { refreshTokenCookieOptions } from "../../lib/refresh-token-cookie.ts";
import { generateRefreshToken, hashToken } from "../../lib/tokens.ts";

const refreshSessionBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export async function refreshSession(app: FastifyInstance) {
  app.post("/sessions/refresh", async (request, reply) => {
    const { refreshToken: bodyToken } = refreshSessionBodySchema.parse(
      request.body ?? {},
    );
    const presentedToken =
      request.cookies[REFRESH_TOKEN_COOKIE_NAME] ?? bodyToken;

    if (!presentedToken) {
      return reply.status(401).send({ message: "missing refresh token" });
    }

    const existing = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(presentedToken) },
    });

    if (!existing || existing.expiresAt < new Date()) {
      return reply.status(401).send({ message: "invalid refresh token" });
    }

    if (existing.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      reply.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
        path: REFRESH_TOKEN_COOKIE_PATH,
      });

      return reply
        .status(401)
        .send({ message: "refresh token reuse detected, session revoked" });
    }

    const newRefreshToken = generateRefreshToken();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: existing.userId,
          tokenHash: hashToken(newRefreshToken),
          familyId: existing.familyId,
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    const accessToken = await reply.jwtSign(
      { sub: existing.userId },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    reply.setCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      newRefreshToken,
      refreshTokenCookieOptions,
    );

    return reply
      .status(200)
      .send({ accessToken, refreshToken: newRefreshToken });
  });
}
