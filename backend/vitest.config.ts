import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./tests/setup/global-setup.ts",
    // Container start + `prisma migrate deploy` can take a few seconds.
    hookTimeout: 30_000,
    // One shared Postgres instance for the whole run (not per file) — keeps
    // the truncate-between-tests reset strategy simple and correct. See
    // `fastify-prisma-testing` skill's "Speeding this up later" for how to
    // parallelize once the suite is big enough for this to matter.
    fileParallelism: false,
  },
});
