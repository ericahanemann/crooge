import { describe, expect, it } from "vitest";
import { envSchema } from "../../src/env/index.ts";

const base = {
  DATABASE_URL: "postgresql://localhost:5432/db",
  JWT_SECRET: "x".repeat(32),
  GOOGLE_CLIENT_ID: "client-id",
};
const DSN = "https://abc123@o0.ingest.us.sentry.io/0";

describe("envSchema SENTRY_DSN", () => {
  it("is required in production, so a missing or misnamed var fails boot instead of silently disabling Sentry", () => {
    const result = envSchema.safeParse({
      ...base,
      NODE_ENV: "production",
      SENTRY_DNS: DSN,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toContainEqual([
      "SENTRY_DSN",
    ]);
  });

  it("accepts production with a valid DSN", () => {
    const result = envSchema.safeParse({
      ...base,
      NODE_ENV: "production",
      SENTRY_DSN: DSN,
    });

    expect(result.success).toBe(true);
  });

  it("stays optional outside production", () => {
    expect(envSchema.safeParse({ ...base, NODE_ENV: "dev" }).success).toBe(
      true,
    );
    expect(envSchema.safeParse({ ...base, NODE_ENV: "test" }).success).toBe(
      true,
    );
  });

  it("rejects a DSN that isn't a URL", () => {
    const result = envSchema.safeParse({
      ...base,
      NODE_ENV: "production",
      SENTRY_DSN: "not a url",
    });

    expect(result.success).toBe(false);
  });
});
