import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "../constants.ts";
import { refreshTokenCookieOptions } from "../refresh-token-cookie.ts";
import { sessionResponseSchema } from "../schemas.ts";
import { generateRefreshToken, hashToken } from "../tokens.ts";

const refreshSessionBodySchema = z
  .object({
    refreshToken: z
      .string()
      .optional()
      .describe(
        "Only needed if the client isn't sending the refresh-token cookie (e.g. a server-to-server caller). The cookie takes precedence when both are present.",
      ),
  })
  // request bodies aren't required to send anything at all (a browser
  // client relies purely on the cookie) — default to `{}` so `request.body`
  // is always a defined object rather than `undefined`.
  .default({});

/**
 * Rotates the refresh token and issues a new access token. Each refresh
 * token is single-use: presenting one that was already consumed is treated
 * as token theft and revokes the entire session family (every token
 * descended from the same sign-in), forcing a fresh sign-in.
 */
export async function refreshSession(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/sessions/refresh",
    {
      schema: {
        tags: ["auth"],
        summary: "Refresh a session",
        body: refreshSessionBodySchema,
        response: {
          200: sessionResponseSchema,
          401: errorResponseSchema.describe(
            "Missing, invalid, expired, or already-used refresh token.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken: bodyToken } = request.body;
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
    },
  );
}
