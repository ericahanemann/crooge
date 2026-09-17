import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

// Same construction as `src/lib/prisma.ts`, pointed at whatever
// `DATABASE_URL` `global-setup.ts` set before this module is first
// imported — the Testcontainers instance, never the dev database.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

/** Truncates every table so each test starts from a clean, empty database. */
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`,
  );
}
