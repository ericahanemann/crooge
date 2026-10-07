import { z } from "zod";

/** Validated once at boot, so a missing/malformed env var fails fast with a clear message instead of surfacing later as a confusing runtime error. */
const envSchema = z.object({
  NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
  // Not a secret — this is the OAuth client's public identifier, the same
  // value the frontend passes to Google Identity Services. Required here
  // too: `OAuth2Client.verifyIdToken`'s `audience` check is what stops a
  // Google ID token minted for a *different* app from being accepted.
  GOOGLE_CLIENT_ID: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error("❌ invalid environment variables", _env.error.format());

  throw new Error("invalid environment variables");
}

export const env = _env.data;
