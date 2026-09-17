import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  webServer: [
    {
      // Real disposable Postgres + real Fastify API — see
      // `backend/tests/e2e-server.ts`. Started first; the frontend build
      // below only starts once this responds.
      command: "npm run test:e2e:server",
      cwd: "../backend",
      url: "http://localhost:3333/categories",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Building (not `next dev`) catches build-only failures and matches
      // what actually ships. `next build` alone measured ~2min in this
      // sandbox (Turbopack compile + typecheck + static generation) —
      // give real headroom above that rather than a tight timeout.
      command: "npm run build && npm run start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
