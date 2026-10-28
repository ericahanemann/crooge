import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Counts every query the app issues. These tests pin down that the hot read
// paths issue the same number of queries no matter how much data the user
// has — a per-row query in any of them was invisible locally (~1ms per
// round trip) but added a network round trip per row in production.
const counter = { queries: 0 };

vi.mock("../../../src/lib/prisma.ts", async () => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import(
    "../../../src/generated/prisma/client.ts"
  );
  const base = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return {
    prisma: base.$extends({
      query: {
        async $allOperations({ args, query }) {
          counter.queries++;
          return query(args);
        },
      },
    }),
  };
});

const { app } = await import("../../../src/app.ts");
const {
  createTestCreditCard,
  createTestRecurringSeries,
  createTestTransaction,
  createTestUser,
} = await import("../../setup/factories.ts");
const { prisma, resetDatabase } = await import("../../setup/test-db.ts");

async function get(userId: string, url: string) {
  counter.queries = 0;
  const response = await app.inject({
    method: "GET",
    url,
    headers: { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` },
  });
  expect(response.statusCode).toBe(200);
  return { queries: counter.queries, body: response.json() };
}

function utc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("query budget of hot read paths", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET /transactions materializes recurring occurrences in a fixed number of queries, however many series exist", async () => {
    async function userWithSeries(count: number) {
      const user = await createTestUser();
      for (let i = 0; i < count; i++) {
        await createTestRecurringSeries(user.id, {
          description: `Subscription ${i}`,
          startDate: utc(2026, 1, 15),
        });
      }
      return user;
    }
    const url = "/api/v1/transactions?month=2026-03";
    const one = await userWithSeries(1);
    const ten = await userWithSeries(10);

    const firstVisitOne = await get(one.id, url);
    const firstVisitTen = await get(ten.id, url);
    expect(firstVisitTen.queries).toBe(firstVisitOne.queries);
    expect(firstVisitTen.body.total).toBe(10);

    const revisitOne = await get(one.id, url);
    const revisitTen = await get(ten.id, url);
    expect(revisitTen.queries).toBe(revisitOne.queries);
    expect(revisitTen.queries).toBeLessThan(firstVisitTen.queries);
    expect(revisitTen.body.total).toBe(10);
  });

  it("GET /transactions catches up overdue bills in a fixed number of queries, however many are overdue", async () => {
    async function userWithOverdueBills(count: number) {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 4,
        dueDay: 10,
      });
      for (let i = 0; i < count; i++) {
        const closingDate = utc(2025, i + 2, 4);
        await prisma.creditCardBill.create({
          data: {
            creditCardId: card.id,
            cycleMonth: closingDate.toISOString().slice(0, 7),
            closingDate,
            dueDate: utc(2025, i + 2, 10),
          },
        });
        await createTestTransaction(user.id, {
          creditCardId: card.id,
          paymentMethod: "CREDIT",
          amount: 10 * (i + 1),
          date: utc(2025, i + 1, 20),
        });
      }
      return user;
    }
    const url = "/api/v1/transactions?month=2026-03";
    const one = await userWithOverdueBills(1);
    const five = await userWithOverdueBills(5);

    const withOne = await get(one.id, url);
    const withFive = await get(five.id, url);
    expect(withFive.queries).toBe(withOne.queries);

    const billRows = await prisma.transaction.findMany({
      where: { userId: five.id, creditCardBillId: { not: null } },
      orderBy: { date: "asc" },
    });
    expect(billRows.map((row) => Number(row.amount))).toEqual([
      10, 20, 30, 40, 50,
    ]);
  });

  it("GET /credit-cards/:id/bills computes every bill's amount in a fixed number of queries, however many bills are on the page", async () => {
    async function cardWithBills(count: number) {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 4,
        dueDay: 10,
      });
      for (let i = 0; i < count; i++) {
        const closingDate = utc(2025, i + 1, 4);
        await prisma.creditCardBill.create({
          data: {
            creditCardId: card.id,
            cycleMonth: closingDate.toISOString().slice(0, 7),
            closingDate,
            dueDate: utc(2025, i + 1, 10),
          },
        });
        await createTestTransaction(user.id, {
          creditCardId: card.id,
          paymentMethod: "CREDIT",
          amount: 0.1,
          date: utc(2025, i + 1, 1),
        });
      }
      return { user, card };
    }
    const one = await cardWithBills(1);
    const twelve = await cardWithBills(12);

    const withOne = await get(
      one.user.id,
      `/api/v1/credit-cards/${one.card.id}/bills`,
    );
    const withTwelve = await get(
      twelve.user.id,
      `/api/v1/credit-cards/${twelve.card.id}/bills`,
    );
    expect(withTwelve.queries).toBe(withOne.queries);
    expect(
      (withTwelve.body.items as { amount: number }[]).map((b) => b.amount),
    ).toEqual(Array(12).fill(0.1));
  });
});
