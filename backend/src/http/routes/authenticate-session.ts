import { hash, verify } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from "../../lib/auth-constants.ts";
import { prisma } from "../../lib/prisma.ts";
import { refreshTokenCookieOptions } from "../../lib/refresh-token-cookie.ts";
import { generateRefreshToken, hashToken } from "../../lib/tokens.ts";

const authenticateSessionBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

// Precomputed once so a login for a non-existent email still pays the
// argon2 verify cost — otherwise timing would reveal which emails exist.
const dummyPasswordHash = await hash(randomBytes(32).toString("hex"));

export async function authenticateSession(app: FastifyInstance) {
  app.post("/sessions", async (request, reply) => {
    const { email, password } = authenticateSessionBodySchema.parse(
      request.body,
    );

    const user = await prisma.user.findUnique({ where: { email } });

    const passwordMatches = await verify(
      user?.password ?? dummyPasswordHash,
      password,
    );

    if (!user || !passwordMatches) {
      return reply.status(401).send({ message: "invalid credentials" });
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
    );

    const refreshToken = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    reply.setCookie(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      refreshTokenCookieOptions,
    );

    return reply.status(200).send({ accessToken, refreshToken });
  });
}
