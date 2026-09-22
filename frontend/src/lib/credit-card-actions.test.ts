import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../tests/setup/msw-server";
import {
  createCreditCardAction,
  deleteCreditCardAction,
  payCreditCardBillAction,
  updateCreditCardAction,
} from "./credit-card-actions";

const API_URL = "http://localhost:3333";

vi.mock("@/lib/session", () => ({
  getAccessToken: () => Promise.resolve("token-123"),
}));

vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("en") }));

describe("createCreditCardAction", () => {
  it("resolves ok on success", async () => {
    server.use(
      http.post(`${API_URL}/credit-cards`, () =>
        HttpResponse.json({ id: "card-1" }, { status: 201 }),
      ),
    );

    await expect(
      createCreditCardAction({
        name: "Nubank",
        brand: "visa",
        limit: 1000,
        closingDay: 10,
        dueDay: 20,
      }),
    ).resolves.toEqual({ ok: true });
  });
});

describe("updateCreditCardAction", () => {
  it("resolves ok on success", async () => {
    server.use(
      http.patch(`${API_URL}/credit-cards/card-1`, () =>
        HttpResponse.json({ id: "card-1" }),
      ),
    );

    await expect(
      updateCreditCardAction("card-1", {
        name: "Nubank",
        brand: "visa",
        limit: 1000,
        closingDay: 10,
        dueDay: 20,
      }),
    ).resolves.toEqual({ ok: true });
  });
});

describe("deleteCreditCardAction", () => {
  it("maps a 409 to has_balance", async () => {
    server.use(
      http.delete(`${API_URL}/credit-cards/card-1`, () =>
        HttpResponse.json(
          { message: "can't archive a card with an unpaid balance" },
          { status: 409 },
        ),
      ),
    );

    await expect(deleteCreditCardAction("card-1")).resolves.toEqual({
      ok: false,
      code: "has_balance",
      message: "can't archive a card with an unpaid balance",
    });
  });

  it("maps any other failure to unknown", async () => {
    server.use(
      http.delete(`${API_URL}/credit-cards/card-1`, () =>
        HttpResponse.json(
          { message: "credit card not found" },
          { status: 404 },
        ),
      ),
    );

    await expect(deleteCreditCardAction("card-1")).resolves.toEqual({
      ok: false,
      code: "unknown",
      message: "credit card not found",
    });
  });
});

describe("payCreditCardBillAction", () => {
  it("sends an empty body when no amount override is given", async () => {
    server.use(
      http.post(
        `${API_URL}/credit-cards/card-1/bills/2026-03/pay`,
        async ({ request }) => {
          const body = await request.json();
          expect(Object.keys(body as object)).toHaveLength(0);
          return HttpResponse.json({ month: "2026-03" });
        },
      ),
    );

    await expect(payCreditCardBillAction("card-1", "2026-03")).resolves.toEqual(
      { ok: true },
    );
  });

  it("sends the amount override when given", async () => {
    server.use(
      http.post(
        `${API_URL}/credit-cards/card-1/bills/2026-03/pay`,
        async ({ request }) => {
          const body = (await request.json()) as { amount?: number };
          expect(body).toEqual({ amount: 42 });
          return HttpResponse.json({ month: "2026-03" });
        },
      ),
    );

    await expect(
      payCreditCardBillAction("card-1", "2026-03", 42),
    ).resolves.toEqual({ ok: true });
  });
});
