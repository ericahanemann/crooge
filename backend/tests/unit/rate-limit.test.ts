import rateLimit from "@fastify/rate-limit";
import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { AUTH_SESSIONS_RATE_LIMIT } from "../../src/http/rate-limit.ts";

// `app.ts` skips registering `@fastify/rate-limit` under the test runner
// (see its comment) — the integration suite fires far more requests at
// these routes in a few seconds than any real client would in the same
// window. This exercises the plugin for real, with the exact config
// `authenticate-session.ts` passes as `config.rateLimit`, against a
// throwaway instance instead.

describe("AUTH_SESSIONS_RATE_LIMIT", () => {
  let app: ReturnType<typeof fastify> | undefined;

  afterEach(async () => {
    await app?.close();
  });

  it("allows up to `max` requests, then 429s", async () => {
    app = fastify();
    await app.register(rateLimit, {
      global: true,
      ...AUTH_SESSIONS_RATE_LIMIT,
    });
    app.post("/sessions", async () => ({ ok: true }));
    await app.ready();

    for (let i = 0; i < AUTH_SESSIONS_RATE_LIMIT.max; i++) {
      const response = await app.inject({ method: "POST", url: "/sessions" });
      expect(response.statusCode).toBe(200);
    }

    const response = await app.inject({ method: "POST", url: "/sessions" });
    expect(response.statusCode).toBe(429);
  });
});
