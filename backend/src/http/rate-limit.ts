/**
 * Per-route overrides for `@fastify/rate-limit` (registered globally in
 * `app.ts` with a generous default — see there). These exist specifically
 * for routes that check a password or mint a session: an attacker spraying
 * one guessed password across many different emails from one IP wouldn't
 * trip `lockout.ts`'s per-key counter (each email only sees one or two
 * attempts), so this is a second, independent axis of defense — limited
 * per *IP* rather than per *key*.
 *
 * In-memory store (the plugin's default) — fine for this app's single
 * Fastify instance; would need the Redis store option if this ever runs
 * as more than one instance behind a load balancer.
 *
 * Typed as a plain `{ max: number; timeWindow: string }` rather than
 * `@fastify/rate-limit`'s own `RateLimitOptions` — that type's `max` also
 * allows a per-request callback, which these fixed configs never use, and
 * which would otherwise force every reader (including
 * `tests/unit/rate-limit.test.ts`, which asserts on `.max` directly) to
 * narrow it back down.
 */
interface RateLimitConfig {
  max: number;
  timeWindow: string;
}

/** `POST /sessions` — the main password-brute-force target. */
export const AUTH_SESSIONS_RATE_LIMIT: RateLimitConfig = {
  max: 10,
  timeWindow: "1 minute",
};

/** `POST /sessions/google` — token verification, not a password check, but still a sign-in endpoint worth capping. */
export const AUTH_GOOGLE_RATE_LIMIT: RateLimitConfig = {
  max: 20,
  timeWindow: "1 minute",
};

/** `POST /sessions/refresh` — legitimate clients call this unprompted (silent refresh), so it's looser than sign-in. */
export const AUTH_REFRESH_RATE_LIMIT: RateLimitConfig = {
  max: 30,
  timeWindow: "1 minute",
};

/** `POST /users` — account creation; capped mainly against mass/spam signups. */
export const AUTH_REGISTER_RATE_LIMIT: RateLimitConfig = {
  max: 10,
  timeWindow: "10 minutes",
};

/** `PATCH /me/password`, `DELETE /me` — authenticated, but both reauth with `currentPassword`. */
export const AUTH_REAUTH_RATE_LIMIT: RateLimitConfig = {
  max: 10,
  timeWindow: "1 minute",
};
