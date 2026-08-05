import { randomBytes, randomUUID } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from "../constants.ts";
import { refreshTokenCookieOptions } from "../refresh-token-cookie.ts";
import { sessionResponseSchema } from "../schemas.ts";
import { generateRefreshToken, hashToken } from "../tokens.ts";

const authenticateSessionBodySchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

// Precomputed once so a login for a non-existent email still pays the
// argon2 verify cost — otherwise timing would reveal which emails exist.
const dummyPasswordHash = await hash(randomBytes(32).toString("hex"));

/** Signs in with email + password. Issues a new access token and a new refresh-token *family* (also set as an httpOnly cookie). */
export async function authenticateSession(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/sessions",
    {
      schema: {
        tags: ["auth"],
        summary: "Sign in",
        body: authenticateSessionBodySchema,
        response: {
          200: sessionResponseSchema,
          401: errorResponseSchema.describe("Invalid email or password."),
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

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
    },
  );
}
