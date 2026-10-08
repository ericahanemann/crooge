import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import { verifyGoogleIdToken } from "../google-token.ts";
import { meResponseSchema } from "../schemas.ts";
import { serializeMe } from "../serialize.ts";

const linkGoogleBodySchema = z.object({
  idToken: z.string().min(1),
});

/**
 * Links a Google account to the already-authenticated caller. This is the
 * completion step for `POST /sessions/google`'s refusal case: a user who
 * proved their existing password via `POST /sessions` calls this next to
 * attach Google as an additional sign-in method on that same account —
 * see `google-sign-in.ts`'s docstring for why that case can't auto-link.
 *
 * Also doubles as a "connect Google" action from the profile page for
 * anyone who signed up with a password and later wants Google too.
 */
export async function linkGoogle(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/me/google",
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "Link a Google account to the current user",
        security: [{ bearerAuth: [] }],
        body: linkGoogleBodySchema,
        response: {
          200: meResponseSchema,
          400: errorResponseSchema.describe(
            "The Google account's email doesn't match this account's email.",
          ),
          401: errorResponseSchema.describe(
            "Invalid, expired, or unverified-email Google token.",
          ),
          404: errorResponseSchema,
          409: errorResponseSchema.describe(
            "That Google account is already linked to a different user.",
          ),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { idToken } = request.body;

      const profile = await verifyGoogleIdToken(idToken).catch(() => null);
      if (!profile) {
        return reply.status(401).send({ message: "invalid Google token" });
      }
      if (!profile.emailVerified) {
        return reply
          .status(401)
          .send({ message: "Google account email is not verified" });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ message: "user not found" });
      }

      // Deliberately strict: this route exists specifically to attach
      // Google to the account whose password the caller just proved —
      // not to link an unrelated Google identity to it.
      if (profile.email !== user.email) {
        return reply.status(400).send({
          message:
            "this Google account's email doesn't match your account's email",
        });
      }

      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: {
            googleId: profile.googleId,
            // Only prefill — never overwrite an avatar the user already
            // set by hand.
            ...(user.avatarUrl ? {} : { avatarUrl: profile.picture }),
          },
        });
        return reply.status(200).send(serializeMe(updated));
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return reply.status(409).send({
            message:
              "this Google account is already linked to a different user",
          });
        }
        throw error;
      }
    },
  );
}
