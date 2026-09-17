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
 * Sets `process.env.NODE_ENV`/`DATABASE_URL`/`JWT_SECRET` as a side effect —
 * callers must do this *before* anything imports `src/app.ts` (transitively
 * `src/env/index.ts`, which validates those at import time). That's what
 * makes this enough for full test isolation without a `buildApp()` factory —
 * see `docs/next-steps.md`'s "one deliberate deviation" note.
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
