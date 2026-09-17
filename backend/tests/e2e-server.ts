import { startTestDatabase } from "./setup/testcontainers-db.ts";

/**
 * The backend half of the frontend's Playwright E2E journeys
 * (`frontend/playwright.config.ts`'s `webServer` array runs this first,
 * waits for it to answer, then starts the frontend). Same disposable
 * Testcontainers Postgres as the Vitest suite — never the dev database —
 * but this process stays running in the foreground instead of exiting, since
 * Playwright manages it as a long-lived server, not a one-shot setup step.
 *
 * `app`/`env` are imported *after* `startTestDatabase()` sets
 * `process.env.DATABASE_URL`/`JWT_SECRET` — both are read at import time
 * (`src/env/index.ts`), so the order here matters.
 */
await startTestDatabase();

const { app } = await import("../src/app.ts");
const { env } = await import("../src/env/index.ts");

await app.listen({ host: "0.0.0.0", port: env.PORT });
console.log(`🚀 E2E backend running on port ${env.PORT}`);
