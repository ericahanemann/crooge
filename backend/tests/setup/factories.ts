import { hash } from "@node-rs/argon2";
import { prisma } from "./test-db.ts";

/**
 * A password that would also pass `register-user.ts`'s complexity rule, for
 * tests that log in with it afterward. A plain literal, deliberately — it
 * only ever authenticates against a disposable Testcontainers Postgres that
 * doesn't exist outside the test run, so there's no real credential here to
 * protect. GitGuardian's PR check still flags it (its "Generic Password"
 * detector triggers on the password-context *shape*, not on whether the
 * value is guessable or secret) — resolved as a false positive/test
 * credential in the GitGuardian dashboard rather than obscured in code.
 */
export const TEST_USER_PASSWORD = "correct-horse-battery-1!";

export async function createTestUser(
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const password = overrides.password ?? TEST_USER_PASSWORD;
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.test`,
      password: await hash(password),
    },
  });
}
