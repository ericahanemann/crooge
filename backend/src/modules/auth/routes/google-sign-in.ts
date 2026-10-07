import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  categoryKindSchema,
  iconKeySchema,
  KIND_TO_DB,
} from "../../categories/schemas.ts";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from "../constants.ts";
import { verifyGoogleIdToken } from "../google-token.ts";
import { refreshTokenCookieOptions } from "../refresh-token-cookie.ts";
import { sessionResponseSchema } from "../schemas.ts";
import { generateRefreshToken, hashToken } from "../tokens.ts";

/**
 * `sessionResponseSchema` plus `created` — the frontend needs to know
 * whether this call made a brand-new account to decide which direction
 * its preference-cookie reconciliation goes (carry the visitor's cookie
 * choice up into a new account vs. let the existing account's stored
 * value win) — same distinction `signUpAction`/`signInAction` already
 * make for password auth, just folded into one endpoint here since
 * sign-in-or-sign-up is one call for Google.
 */
const googleSessionResponseSchema = sessionResponseSchema.extend({
  created: z.boolean(),
});

const googleSignInBodySchema = z.object({
  idToken: z
    .string()
    .min(1)
    .describe(
      "ID token from Google Identity Services — verified server-side against Google's public keys, never trusted as-is.",
    ),
  categories: z
    .array(
      z.object({
        kind: categoryKindSchema,
        label: z.string().trim().min(1),
        icon: iconKeySchema,
        isFallback: z.boolean().optional(),
      }),
    )
    .optional()
    .describe(
      "Starter categories to seed, same as `POST /users` — only used if this call creates a brand-new account; ignored when signing into (or linking) an existing one.",
    ),
});

/**
 * Signs in with Google — creates a new account on first use, or resolves
 * to an existing one. Issues the same access/refresh token pair as
 * `POST /sessions`; Google is only ever used to establish identity, never
 * as the session itself.
 *
 * Linking policy, deliberately asymmetric:
 * - No existing account for this email → create one (`password: null`).
 * - Existing account with this email, itself passwordless (created by a
 *   prior Google sign-in, or never given a password) → safe to link
 *   automatically; nothing else could be relying on "knowing the
 *   password" for that account.
 * - Existing account with this email that *has* a password → refuses
 *   (`409`) rather than silently attaching Google to it. This app's own
 *   signup never verifies email ownership, so an attacker could have
 *   pre-created an account under someone else's email; auto-linking a
 *   verified Google identity to that account would hand the real owner
 *   into an account the attacker's password still unlocks. Linking this
 *   case requires `POST /me/google` instead — authenticated, i.e. only
 *   reachable after proving the existing password.
 */
export async function googleSignIn(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/sessions/google",
    {
      schema: {
        tags: ["auth"],
        summary: "Sign in (or sign up) with Google",
        body: googleSignInBodySchema,
        response: {
          200: googleSessionResponseSchema,
          401: errorResponseSchema.describe(
            "Invalid, expired, or unverified-email Google token.",
          ),
          409: errorResponseSchema.describe(
            "An account with this email already exists and has a password — sign in with it, then call `POST /me/google` to link.",
          ),
        },
      },
    },
    async (request, reply) => {
      const { idToken, categories } = request.body;

      const profile = await verifyGoogleIdToken(idToken).catch(() => null);
      if (!profile) {
        return reply.status(401).send({ message: "invalid Google token" });
      }
      if (!profile.emailVerified) {
        return reply
          .status(401)
          .send({ message: "Google account email is not verified" });
      }

      let user = await prisma.user.findUnique({
        where: { googleId: profile.googleId },
      });
      let isNewAccount = false;

      if (!user) {
        const existingByEmail = await prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (existingByEmail) {
          if (existingByEmail.password) {
            return reply.status(409).send({
              message:
                "an account with this email already exists — sign in with your password to link Google",
            });
          }

          user = await prisma.user.update({
            where: { id: existingByEmail.id },
            data: { googleId: profile.googleId },
          });
        } else {
          isNewAccount = true;
          const newUser = await prisma.user.create({
            data: {
              name: profile.name,
              email: profile.email,
              googleId: profile.googleId,
              password: null,
            },
          });
          user = newUser;

          if (categories?.length) {
            await prisma.category.createMany({
              data: categories.map((c) => ({
                userId: newUser.id,
                kind: KIND_TO_DB[c.kind],
                label: c.label,
                icon: c.icon,
                isFallback: c.isFallback ?? false,
              })),
            });
          }
        }
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

      return reply
        .status(200)
        .send({ accessToken, refreshToken, created: isNewAccount });
    },
  );
}
