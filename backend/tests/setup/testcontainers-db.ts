import { execSync } from "node:child_process";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

/**
 * Starts one disposable Postgres container and migrates it from scratch —
 * never the project's `docker compose` dev database, so nothing a test run
 * does (including `test-db.ts#resetDatabase`'s blanket truncation) can ever
 * touch real data.
 *
 * Sets `process.env.NODE_ENV`/`DATABASE_URL`/`JWT_SECRET`/`GOOGLE_CLIENT_ID`
 * as a side effect — callers must do this *before* anything imports
 * `src/app.ts` (transitively `src/env/index.ts`, which validates those at
 * import time). That's what makes this enough for full test isolation
 * without a `buildApp()` factory — see `docs/next-steps.md`'s "one
 * deliberate deviation" note.
 *
 * `GOOGLE_CLIENT_ID` here is just a placeholder satisfying `env/index.ts`'s
 * schema — no test actually calls Google's servers. `verifyGoogleIdToken`
 * (`src/modules/auth/google-token.ts`) is `vi.mock`'d instead wherever a
 * test needs a resolved Google identity — the one deliberate exception to
 * this suite's "exercise the real route" preference, since the thing being
 * skipped is a third-party network call, not app logic.
 *
 * Shared by two callers with different lifecycles: Vitest's
 * `global-setup.ts` (container lives for one `vitest run`, stopped via the
 * returned `stop()`) and the Playwright E2E backend (`../e2e-server.ts`,
 * container lives as long as the server process Playwright manages).
 */
export async function startTestDatabase(): Promise<{
  stop: () => Promise<void>;
}> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:18",
  ).start();

  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

  execSync("npx prisma migrate deploy", {
    env: process.env,
    stdio: "inherit",
  });

  return {
    stop: async () => {
      await container.stop();
    },
  };
}
