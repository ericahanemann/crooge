import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/app.ts";
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_INSTALLMENTS,
  MAX_MONEY,
  MAX_SEEDED_CATEGORIES,
} from "../../../src/http/schemas/common.ts";
import { createTestUser } from "../../setup/factories.ts";
import { prisma, resetDatabase } from "../../setup/test-db.ts";

async function postExpense(userId: string, overrides: Record<string, unknown>) {
  return app.inject({
    method: "POST",
    url: "/api/v1/transactions",
    headers: { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` },
    payload: {
      type: "expense",
      description: "Thing",
      amount: 100,
      date: "2026-05-13",
      category: "shopping",
      paymentMethod: "debit_pix",
      ...overrides,
    },
  });
}

// Each of these used to be accepted and then either 500 at the database
// (and page Sentry) or, for installments, let one request create as many
// rows as it asked for.
describe("request input bounds", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects more than the max installments with a 400, writing nothing", async () => {
    const user = await createTestUser();

    const response = await postExpense(user.id, {
      timing: "installments",
      installments: MAX_INSTALLMENTS + 1,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().issues).toHaveProperty("installments");
    expect(await prisma.transaction.count()).toBe(0);
  });

  it("accepts exactly the max installments", async () => {
    const user = await createTestUser();

    const response = await postExpense(user.id, {
      timing: "installments",
      installments: MAX_INSTALLMENTS,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveLength(MAX_INSTALLMENTS);
  });

  it("rejects an amount the Decimal(12, 2) column can't hold with a 400 instead of a database 500", async () => {
    const user = await createTestUser();

    const tooBig = await postExpense(user.id, { amount: MAX_MONEY + 1 });
    expect(tooBig.statusCode).toBe(400);
    expect(tooBig.json().issues).toHaveProperty("amount");

    const atLimit = await postExpense(user.id, { amount: MAX_MONEY });
    expect(atLimit.statusCode).toBe(201);
  });

  it("rejects an over-long description", async () => {
    const user = await createTestUser();

    const response = await postExpense(user.id, {
      description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().issues).toHaveProperty("description");
  });

  it("rejects seeding more than the max starter categories at signup", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: {
        name: "New User",
        email: "new@example.test",
        password: "s3cret!pass",
        categories: Array.from(
          { length: MAX_SEEDED_CATEGORIES + 1 },
          (_, i) => ({ kind: "expense", label: `Category ${i}`, icon: "tag" }),
        ),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });
});
