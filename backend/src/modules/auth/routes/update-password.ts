import { hash, verify } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { passwordSchema } from "../schemas.ts";
import { hashToken } from "../tokens.ts";

const updatePasswordBodySchema = z.object({
  currentPassword: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Required unless the account has no password yet (a Google-only account setting its first one — see `hasPassword` on `GET /me`).",
    ),
  newPassword: passwordSchema,
  refreshToken: z
    .string()
    .optional()
    .describe(
      "The caller's own refresh token, if held — identifies which session " +
        "family to keep signed in while every other family is revoked. " +
        "Omit to sign out of every session, including this one.",
    ),
});

/**
 * Changes the authenticated user's password and revokes every other
 * refresh-token family (every session descended from a different sign-in).
 * The family matching the presented `refreshToken`, if any, is left alone
 * so the device making this request isn't signed out of its own change.
 *
 * Known accepted limitation: the access token used to call this endpoint
 * (stateless JWT, 15-minute lifetime) stays valid until it naturally
 * expires — there's no blocklist, matching how the rest of the app already
 * treats access tokens (refresh-token-reuse detection doesn't revoke
 * outstanding access tokens either, see `refresh-session.ts`).
 *
 * A Google-only account (`user.password === null`) has nothing to reauth
 * against, so `currentPassword` isn't required for *that* account's first
 * password — the access token alone is sufficient, same trust level as
 * every other authenticated `PATCH /me*` field. It's still required, and
 * still verified, for every account that already has one.
 */
export async function updatePassword(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().patch(
    "/me/password",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Change the current user's password",
        security: [{ bearerAuth: [] }],
        body: updatePasswordBodySchema,
        response: {
          204: z.void().describe("Password changed."),
          401: errorResponseSchema.describe(
            "`currentPassword` didn't match, or was missing on an account that has one.",
          ),
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { currentPassword, newPassword, refreshToken } = request.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ message: "user not found" });
      }

      if (user.password) {
        if (
          !currentPassword ||
          !(await verify(user.password, currentPassword))
        ) {
          return reply.status(401).send({ message: "incorrect password" });
        }
      }
      // else: no password set yet — this is the account's first one,
      // nothing to verify against.

      const newPasswordHash = await hash(newPassword);

      const currentSession = refreshToken
        ? await prisma.refreshToken.findUnique({
            where: { tokenHash: hashToken(refreshToken) },
          })
        : null;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { password: newPasswordHash },
        }),
        prisma.refreshToken.updateMany({
          where: {
            userId,
            revokedAt: null,
            ...(currentSession
              ? { familyId: { not: currentSession.familyId } }
              : {}),
          },
          data: { revokedAt: new Date() },
        }),
      ]);

      return reply.status(204).send();
    },
  );
}
