import { verify } from "@node-rs/argon2";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { AUTH_REAUTH_RATE_LIMIT } from "../../../http/rate-limit.ts";
import { errorResponseSchema } from "../../../http/schemas/common.ts";
import { prisma } from "../../../lib/prisma.ts";
import {
  clearFailedAttempts,
  isLockedOut,
  registerFailedAttempt,
} from "../lockout.ts";

const deleteMeBodySchema = z
  .object({
    currentPassword: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Required unless the account has no password (a Google-only account — see `hasPassword` on `GET /me`).",
      ),
  })
  .default({});

/**
 * Permanently deletes the authenticated user's account and everything that
 * belongs only to it — every FK into `users` is `ON DELETE RESTRICT`
 * deliberately (see `schema.prisma`), so this can't be `prisma.user.delete()`
 * alone; it has to delete every dependent row itself, in the order their own
 * FKs allow; one `$transaction` so a mid-way failure leaves nothing
 * half-deleted:
 *
 * 1. `Transaction` (references `CreditCard`/`CreditCardBill`/`RecurringSeries`/`User`)
 * 2. `CreditCardBill` (references `CreditCard`; no longer referenced by any transaction)
 * 3. `RecurringSeries` (references `CreditCard`/`User`; no longer referenced by any transaction)
 * 4. `CreditCard` (references `User`; no longer referenced by bills/transactions/series)
 * 5. `Category`, `RefreshToken` (reference `User` only, independent of each other)
 * 6. `User`
 *
 * Doesn't touch cookies or revoke the access token presenting it — same
 * accepted limitation as `PATCH /me/password` (stateless JWT, 15-minute
 * lifetime, no blocklist). The frontend clears its own session cookies and
 * redirects after a successful `204`, same as it does after a password
 * change.
 */
export async function deleteMe(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    "/me",
    {
      onRequest: [app.authenticate],
      config: { rateLimit: AUTH_REAUTH_RATE_LIMIT },
      schema: {
        tags: ["auth"],
        summary: "Permanently delete the current user's account",
        security: [{ bearerAuth: [] }],
        body: deleteMeBodySchema,
        response: {
          204: z
            .void()
            .describe(
              "Deleted — the account and every transaction/card/bill/category/recurring series it owned.",
            ),
          401: errorResponseSchema.describe(
            "`currentPassword` didn't match, or was missing on an account that has one.",
          ),
          404: errorResponseSchema,
          429: errorResponseSchema.describe(
            "Too many failed reauth attempts — locked out for a while.",
          ),
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.sub;
      const { currentPassword } = request.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ message: "user not found" });
      }

      if (user.password) {
        const lockoutKey = `user:${userId}`;
        if (await isLockedOut(lockoutKey)) {
          return reply.status(429).send({
            message: "too many failed attempts — try again later",
          });
        }

        if (
          !currentPassword ||
          !(await verify(user.password, currentPassword))
        ) {
          await registerFailedAttempt(lockoutKey);
          return reply.status(401).send({ message: "incorrect password" });
        }

        await clearFailedAttempts(lockoutKey);
      }
      // else: Google-only account, nothing to reauth against — the access
      // token alone is sufficient, same trust level as every other
      // authenticated `PATCH /me*` field.

      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { userId } }),
        prisma.creditCardBill.deleteMany({
          where: { creditCard: { userId } },
        }),
        prisma.recurringSeries.deleteMany({ where: { userId } }),
        prisma.creditCard.deleteMany({ where: { userId } }),
        prisma.category.deleteMany({ where: { userId } }),
        prisma.refreshToken.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);

      return reply.status(204).send();
    },
  );
}
