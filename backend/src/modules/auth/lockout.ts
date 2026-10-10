import { prisma } from "../../lib/prisma.ts";
import {
  AUTH_LOCKOUT_DURATION_MS,
  MAX_FAILED_AUTH_ATTEMPTS,
} from "./constants.ts";

/**
 * Brute-force defense for anything that checks a password:
 * `authenticate-session.ts` (keyed by the presented, lowercased email —
 * see `AuthAttempt`'s docstring in `schema.prisma` for why not a user id),
 * and `update-password.ts`/`delete-me.ts`'s `currentPassword` reauth
 * (keyed by `user:<id>`, safe to use the real id there since the caller is
 * already authenticated).
 *
 * Paired with `@fastify/rate-limit` on the same routes (see `app.ts`): that
 * caps requests per IP regardless of which key they target (stops an
 * attacker spraying one password across many emails from one address),
 * this caps attempts per key regardless of IP (stops the same attacker
 * rotating across many addresses against one target).
 */

export async function isLockedOut(key: string): Promise<boolean> {
  const attempt = await prisma.authAttempt.findUnique({ where: { key } });
  return !!attempt?.lockedUntil && attempt.lockedUntil > new Date();
}

/** Call after a failed check. Locks the key once it crosses the threshold. */
export async function registerFailedAttempt(key: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.authAttempt.findUnique({ where: { key } });

  // A lockout that already expired starts a fresh count rather than
  // compounding onto the stale one.
  const expired = !!existing?.lockedUntil && existing.lockedUntil <= now;
  const failedCount = (expired || !existing ? 0 : existing.failedCount) + 1;
  const lockedUntil =
    failedCount >= MAX_FAILED_AUTH_ATTEMPTS
      ? new Date(now.getTime() + AUTH_LOCKOUT_DURATION_MS)
      : null;

  await prisma.authAttempt.upsert({
    where: { key },
    create: { key, failedCount, lockedUntil },
    update: { failedCount, lockedUntil },
  });
}

/** Call after a successful check, so a legitimate miss-typed password or two doesn't linger toward a future lockout. */
export async function clearFailedAttempts(key: string): Promise<void> {
  await prisma.authAttempt.deleteMany({ where: { key } });
}
