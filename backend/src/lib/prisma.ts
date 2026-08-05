import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../env/index.ts";
import { PrismaClient } from "../generated/prisma/client.ts";

// Shared across the whole process (Prisma manages its own connection pool
// internally) — routes import this instead of constructing their own client.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "dev" ? ["query"] : [],
});
