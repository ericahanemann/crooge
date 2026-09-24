import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../tests/setup/msw-server";
import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from "./transaction-actions";

const API_URL = "http://localhost:3333";

vi.mock("@/lib/session", () => ({
  getAccessToken: () => Promise.resolve("token-123"),
}));

vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("en") }));

describe("createTransactionAction", () => {
  it("resolves paymentMethod credit with no creditCardId to the caller's first card", async () => {
    server.use(
      http.get(`${API_URL}/credit-cards`, () =>
        HttpResponse.json([{ id: "card-1" }, { id: "card-2" }]),
      ),
      http.post(`${API_URL}/transactions`, async ({ request }) => {
        const body = (await request.json()) as { creditCardId?: string };
        expect(body.creditCardId).toBe("card-1");
        return HttpResponse.json([], { status: 201 });
      }),
    );

    const result = await createTransactionAction({
      type: "expense",
      description: "Flight",
      amount: 100,
      date: "2026-03-05",
      category: "travel",
      paymentMethod: "credit",
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns no_credit_card when paying by credit with zero cards, without posting a transaction", async () => {
    server.use(
      http.get(`${API_URL}/credit-cards`, () => HttpResponse.json([])),
    );

    const result = await createTransactionAction({
      type: "expense",
      description: "Flight",
      amount: 100,
      date: "2026-03-05",
      category: "travel",
      paymentMethod: "credit",
    });

    expect(result).toEqual({
      ok: false,
      code: "no_credit_card",
      message: "no credit card",
    });
  });

  it("skips the card lookup entirely when creditCardId is already given", async () => {
    server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json([], { status: 201 }),
      ),
    );

    const result = await createTransactionAction({
      type: "expense",
      description: "Flight",
      amount: 100,
      date: "2026-03-05",
      category: "travel",
      paymentMethod: "credit",
      creditCardId: "card-1",
    });

    expect(result).toEqual({ ok: true });
  });

  it("maps a 422 response to credit_limit_exceeded", async () => {
    server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json(
          { message: "purchase exceeds available credit" },
          { status: 422 },
        ),
      ),
    );

    const result = await createTransactionAction({
      type: "expense",
      description: "Flight",
      amount: 100,
      date: "2026-03-05",
      category: "travel",
      paymentMethod: "credit",
      creditCardId: "card-1",
    });

    expect(result).toEqual({
      ok: false,
      code: "credit_limit_exceeded",
      message: "purchase exceeds available credit",
    });
  });

  it("maps any other failure to unknown", async () => {
    server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json(
          { message: "internal server error" },
          { status: 500 },
        ),
      ),
    );

    const result = await createTransactionAction({
      type: "income",
      description: "Paycheck",
      amount: 100,
      date: "2026-03-05",
      category: "salary",
    });

    expect(result).toEqual({
      ok: false,
      code: "unknown",
      message: "internal server error",
    });
  });
});

describe("updateTransactionAction", () => {
  it("resolves paymentMethod credit with no creditCardId to the caller's first card", async () => {
    server.use(
      http.get(`${API_URL}/credit-cards`, () =>
        HttpResponse.json([{ id: "card-1" }]),
      ),
      http.patch(`${API_URL}/transactions/t1`, async ({ request }) => {
        const body = (await request.json()) as { creditCardId?: string };
        expect(body.creditCardId).toBe("card-1");
        return HttpResponse.json({ id: "t1" });
      }),
    );

    const result = await updateTransactionAction("t1", {
      paymentMethod: "credit",
    });

    expect(result).toEqual({ ok: true });
  });
});

describe("deleteTransactionAction", () => {
  it("resolves ok on success", async () => {
    server.use(
      http.delete(
        `${API_URL}/transactions/t1`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(deleteTransactionAction("t1")).resolves.toEqual({ ok: true });
  });

  it("resolves ok:false with the backend message on failure", async () => {
    server.use(
      http.delete(`${API_URL}/transactions/t1`, () =>
        HttpResponse.json(
          { message: "can't delete a bill-materialized transaction" },
          { status: 409 },
        ),
      ),
    );

    await expect(deleteTransactionAction("t1")).resolves.toEqual({
      ok: false,
      message: "can't delete a bill-materialized transaction",
    });
  });
});
