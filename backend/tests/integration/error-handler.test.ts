import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { app } from "../../src/app.ts";
import { Prisma } from "../../src/generated/prisma/client.ts";
import { Sentry } from "../../src/lib/sentry.ts";
import { createTestUser } from "../setup/factories.ts";

vi.mock("@sentry/node");

// Registered once, before `app.ready()` below — Fastify only accepts new
// routes while not yet listening, same constraint every real route in
// `src/modules` is already under.
app.get("/api/v1/__test/throw", { onRequest: [app.authenticate] }, async () => {
  throw new Error("boom");
});

// The exact failure the 12-installment bug produced in production.
app.get("/api/v1/__test/throw-prisma", async () => {
  throw new Prisma.PrismaClientKnownRequestError(
    "Transaction API error: A query cannot be executed on an expired transaction.",
    { code: "P2028", clientVersion: "test" },
  );
});

async function authHeader(userId: string) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe("global error handler (app.ts)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
    vi.mocked(Sentry.flush).mockClear();
  });

  it("tags a Prisma failure with its error code and route, and flushes before responding", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/__test/throw-prisma",
    });

    expect(response.statusCode).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [, captureContext] = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(captureContext).toMatchObject({
      tags: {
        prismaCode: "P2028",
        route: "GET /api/v1/__test/throw-prisma",
        requestId: response.json().requestId,
      },
    });
    // Without this, the event was only queued — and never arrived in prod.
    expect(Sentry.flush).toHaveBeenCalled();
  });

  it("reports an unexpected error to Sentry with request context, and returns a requestId the client can correlate", async () => {
    const user = await createTestUser();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/__test/throw",
      headers: await authHeader(user.id),
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.message).toBe("internal server error");
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId.length).toBeGreaterThan(0);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [error, captureContext] = vi.mocked(Sentry.captureException).mock
      .calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("boom");
    expect(captureContext).toMatchObject({
      contexts: {
        request: {
          method: "GET",
          url: "/api/v1/__test/throw",
        },
      },
      tags: { requestId: body.requestId },
      user: { id: user.id },
    });
  });

  it("never reaches the throwing handler without auth, so nothing is reported", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/__test/throw",
    });

    expect(response.statusCode).toBe(401);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does not report a validation error (a client mistake, not a bug) to Sentry, and has no requestId", async () => {
    const user = await createTestUser();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: await authHeader(user.id),
      payload: { type: "expense" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().requestId).toBeUndefined();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("does not report a known 4xx raised by a route itself (not thrown) to Sentry", async () => {
    const user = await createTestUser();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/credit-cards/00000000-0000-0000-0000-000000000000",
      headers: await authHeader(user.id),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().requestId).toBeUndefined();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
