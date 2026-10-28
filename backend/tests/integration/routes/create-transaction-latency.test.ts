import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Every query the app makes pays this much fake network latency, standing in
// for the round trip to the remote production database (local Testcontainers
// answers in ~1ms, which is why the bug below never showed up in tests).
const DB_LATENCY_MS = 120;

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
          await new Promise((resolve) => setTimeout(resolve, DB_LATENCY_MS));
          return query(args);
        },
      },
    }),
  };
});

const { app } = await import("../../../src/app.ts");
const { createTestCreditCard, createTestUser } = await import(
  "../../setup/factories.ts"
);
const { prisma, resetDatabase } = await import("../../setup/test-db.ts");

describe("POST /transactions under realistic database latency", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  // Regression: installments used to be written one bill upsert + one
  // insert at a time inside an interactive transaction, so at prod latency
  // a 12-installment purchase outran Prisma's 5s transaction timeout and
  // 500'd. 24 installments here would take ~5.8s that way.
  it("creates a long credit card installment purchase well within the transaction timeout", async () => {
    const user = await createTestUser();
    const card = await createTestCreditCard(user.id, {
      limit: 50_000,
      closingDay: 4,
      dueDay: 10,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/transactions",
      headers: {
        authorization: `Bearer ${app.jwt.sign({ sub: user.id })}`,
      },
      payload: {
        type: "expense",
        description: "Rocketseat One",
        amount: 1318.2,
        date: "2026-05-13",
        category: "education",
        paymentMethod: "credit",
        creditCardId: card.id,
        timing: "installments",
        installments: 24,
      },
    });

    expect(response.statusCode).toBe(201);
    const rows = response.json() as {
      date: string;
      installmentCurrent: number;
    }[];
    expect(rows.map((row) => row.installmentCurrent)).toEqual(
      Array.from({ length: 24 }, (_, i) => i + 1),
    );
    expect(rows[0]?.date).toBe("2026-05-13");
    expect(rows[23]?.date).toBe("2028-04-13");

    const bills = await prisma.creditCardBill.findMany({
      where: { creditCardId: card.id },
      orderBy: { cycleMonth: "asc" },
    });
    expect(bills).toHaveLength(24);
    expect(bills[0]?.cycleMonth).toBe("2026-06");
    expect(bills[23]?.cycleMonth).toBe("2028-05");
  });
});
