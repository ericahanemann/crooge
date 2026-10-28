import { z } from "zod";

/** Validated once at boot, so a missing/malformed env var fails fast with a clear message instead of surfacing later as a confusing runtime error. */
export const envSchema = z
  .object({
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
    // Which reverse proxy(s) in front of this process to trust for
    // `request.ip` (which `@fastify/rate-limit`'s per-IP configs key off of
    // — see `http/rate-limit.ts`). Unset/empty keeps Fastify's default
    // (`false` — trust nothing, `request.ip` is always the socket's direct
    // peer), which is correct with no proxy in front but makes every
    // request look like it's coming from the proxy's one IP once there is
    // one, collapsing per-IP rate limiting into a single shared bucket. Set
    // to the proxy's address (or a comma-separated list) once a host is
    // chosen — see `resolveTrustProxy` in `lib/trust-proxy.ts` for exactly
    // what this accepts, and why it's not just "how many hops."
    TRUST_PROXY: z.string().optional(),
    // DSN Sentry gives a project, e.g. "https://<key>@o0.ingest.sentry.io/0".
    // Unset in dev/test on purpose — `lib/sentry.ts` only calls `Sentry.init`
    // when this is present, so local runs and the test suite never report
    // anywhere. Required in production (see the refinement below).
    SENTRY_DSN: z.url().optional(),
    // Set automatically by Render to the deployed commit SHA.
    RENDER_GIT_COMMIT: z.string().optional(),
  })
  // Without this, a missing or misnamed SENTRY_DSN in prod just silently
  // disables error reporting — failing boot makes the deploy itself fail
  // instead, where it's visible.
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && !data.SENTRY_DSN) {
      ctx.addIssue({
        code: "custom",
        path: ["SENTRY_DSN"],
        message: "required when NODE_ENV is production",
      });
    }
  });

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error(
    `❌ invalid environment variables\n${z.prettifyError(_env.error)}`,
  );

  throw new Error("invalid environment variables");
}

export const env = _env.data;
