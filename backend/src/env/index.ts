import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error("❌ invalid environment variables", _env.error.format());

  throw new Error("invalid environment variables");
}

export const env = _env.data;
