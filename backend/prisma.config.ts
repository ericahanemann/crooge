import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Falls back to a placeholder rather than throwing when unset. The only
    // command that runs without a real DATABASE_URL already in scope is
    // `generate` (schema-only, never connects) — e.g. `postinstall` in a
    // fresh CI checkout with no `.env`. Every command that actually talks to
    // a database (migrate deploy, ...) always has a real URL set first,
    // either from `.env` locally or explicitly by the caller (see
    // `tests/setup/testcontainers-db.ts`).
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder@localhost:5432/placeholder",
  },
});
