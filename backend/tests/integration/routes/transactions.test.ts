import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/app.ts";
import {
  createTestCreditCard,
  createTestCreditCardWithBill,
  createTestInstallmentGroup,
  createTestRecurringSeries,
  createTestTransaction,
  createTestUser,
} from "../../setup/factories.ts";
import { prisma, resetDatabase } from "../../setup/test-db.ts";

async function authHeader(userId: string) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe("transactions routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /transactions (income)", () => {
    it("creates a one-time income", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "income",
          description: "Paycheck",
          amount: 5000,
          date: "2026-03-05",
          category: "salary",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].amount).toBe(5000);
      expect(body[0].timing).toBe("oneTime");
    });

    it("rejects amount <= 0 with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "income",
          description: "Paycheck",
          amount: 0,
          date: "2026-03-05",
          category: "salary",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects missing required fields with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: { type: "income", amount: 100, date: "2026-03-05" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /transactions (expense, one-time debit/pix)", () => {
    it("creates a one-time debit/pix expense with a signed negative amount", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Groceries",
          amount: 150,
          date: "2026-03-05",
          category: "food",
          paymentMethod: "debit_pix",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()[0].amount).toBe(-150);
    });

    it("rejects amount <= 0 with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Groceries",
          amount: -1,
          date: "2026-03-05",
          category: "food",
          paymentMethod: "debit_pix",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /transactions (expense, credit)", () => {
    it("creates a one-time credit expense within available credit", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 1000 });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 500,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: card.id,
        },
      });

      expect(response.statusCode).toBe(201);
      const bill = await prisma.creditCardBill.findFirst({
        where: { creditCardId: card.id, cycleMonth: "2026-03" },
      });
      expect(bill).not.toBeNull();
    });

    it("returns 404 when creditCardId doesn't exist", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 500,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: crypto.randomUUID(),
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when creditCardId belongs to another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(attacker.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 500,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: card.id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when creditCardId refers to an archived card", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        archivedAt: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 500,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: card.id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 422 when the purchase exceeds available credit", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 100 });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 200,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: card.id,
        },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        message: "purchase exceeds available credit",
      });
    });

    it("succeeds when the purchase exactly equals available credit", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 100 });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 100,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
          creditCardId: card.id,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("rejects credit paymentMethod with no creditCardId with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Flight",
          amount: 100,
          date: "2026-03-05",
          category: "travel",
          paymentMethod: "credit",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /transactions (installments)", () => {
    it("creates one row per installment sharing a groupId", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Sofa",
          amount: 300,
          date: "2026-01-05",
          category: "home",
          paymentMethod: "debit_pix",
          timing: "installments",
          installments: 3,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body).toHaveLength(3);

      const rows = await prisma.transaction.findMany({
        where: { userId: user.id },
      });
      const groupIds = new Set(rows.map((r) => r.groupId));
      expect(groupIds.size).toBe(1);
    });

    it("absorbs the rounding remainder in the last installment", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Gift",
          amount: 100,
          date: "2026-01-05",
          category: "gifts",
          paymentMethod: "debit_pix",
          timing: "installments",
          installments: 3,
        },
      });

      const amounts = response
        .json()
        .map((t: { amount: number }) => Math.abs(t.amount));
      expect(amounts).toEqual([33.33, 33.33, 33.34]);
      expect(amounts.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(
        100,
        2,
      );
    });

    it("rejects installments < 2 with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Sofa",
          amount: 300,
          date: "2026-01-05",
          category: "home",
          paymentMethod: "debit_pix",
          timing: "installments",
          installments: 1,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("validates the total installment amount against available credit, not per-installment", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 100 });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Sofa",
          amount: 150,
          date: "2026-01-05",
          category: "home",
          paymentMethod: "credit",
          creditCardId: card.id,
          timing: "installments",
          installments: 3,
        },
      });

      expect(response.statusCode).toBe(422);
    });

    it("ensures a bill for each occurrence's own cycle", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        limit: 10000,
        closingDay: 10,
        dueDay: 20,
      });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Sofa",
          amount: 300,
          date: "2026-01-05",
          category: "home",
          paymentMethod: "credit",
          creditCardId: card.id,
          timing: "installments",
          installments: 3,
        },
      });

      expect(response.statusCode).toBe(201);
      const bills = await prisma.creditCardBill.findMany({
        where: { creditCardId: card.id },
      });
      const cycleMonths = bills.map((b) => b.cycleMonth).sort();
      expect(cycleMonths).toEqual(["2026-01", "2026-02", "2026-03"]);
    });
  });

  describe("POST /transactions (recurring)", () => {
    it("creates a RecurringSeries plus its first occurrence", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Rent",
          amount: 1200,
          date: "2026-01-05",
          category: "housing",
          paymentMethod: "debit_pix",
          timing: "recurring",
          frequency: "monthly",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveLength(1);

      const seriesCount = await prisma.recurringSeries.count({
        where: { userId: user.id },
      });
      expect(seriesCount).toBe(1);
    });

    it("rejects timing=recurring with no frequency with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Rent",
          amount: 1200,
          date: "2026-01-05",
          category: "housing",
          paymentMethod: "debit_pix",
          timing: "recurring",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("ensures a bill for the first occurrence when paid by card", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 10,
        dueDay: 20,
      });

      const response = await app.inject({
        method: "POST",
        url: "/transactions",
        headers: await authHeader(user.id),
        payload: {
          type: "expense",
          description: "Subscription",
          amount: 50,
          date: "2026-01-05",
          category: "entertainment",
          paymentMethod: "credit",
          creditCardId: card.id,
          timing: "recurring",
          frequency: "monthly",
        },
      });

      expect(response.statusCode).toBe(201);
      const bill = await prisma.creditCardBill.findFirst({
        where: { creditCardId: card.id, cycleMonth: "2026-01" },
      });
      expect(bill).not.toBeNull();
    });
  });

  describe("PATCH /transactions/:id", () => {
    it("edits description/amount/date/category on a one-time row", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id, {
        description: "Old",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { description: "New" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().description).toBe("New");
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
        payload: { description: "New" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const transaction = await createTestTransaction(owner.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(attacker.id),
        payload: { description: "New" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("rejects an empty body with 400", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 409 when the row is bill-materialized", async () => {
      const user = await createTestUser();
      const { bill } = await createTestCreditCardWithBill(user.id);
      const transaction = await createTestTransaction(user.id, {
        creditCardBillId: bill.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { description: "New" },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 409 editing amount on an installment occurrence, but allows description", async () => {
      const user = await createTestUser();
      const { transactions } = await createTestInstallmentGroup(user.id);
      const target = transactions[0];

      const blocked = await app.inject({
        method: "PATCH",
        url: `/transactions/${target.id}`,
        headers: await authHeader(user.id),
        payload: { amount: 999 },
      });
      expect(blocked.statusCode).toBe(409);

      const allowed = await app.inject({
        method: "PATCH",
        url: `/transactions/${target.id}`,
        headers: await authHeader(user.id),
        payload: { description: "Updated" },
      });
      expect(allowed.statusCode).toBe(200);
    });

    it("returns 409 when an income row is sent paymentMethod/creditCardId", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id, {
        type: "INCOME",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { paymentMethod: "credit" },
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 422 switching to credit with no resolvable creditCardId", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id, {
        paymentMethod: "DEBIT_PIX",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { paymentMethod: "credit" },
      });

      expect(response.statusCode).toBe(422);
    });

    it("clears creditCardId when switching to debit_pix", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 1000 });
      const transaction = await createTestTransaction(user.id, {
        paymentMethod: "CREDIT",
        creditCardId: card.id,
        amount: 50,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { paymentMethod: "debit_pix" },
      });

      expect(response.statusCode).toBe(200);
      const row = await prisma.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(row.creditCardId).toBeNull();
    });

    it("returns 422 and rolls back when the edit exceeds available credit", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 100 });
      const transaction = await createTestTransaction(user.id, {
        paymentMethod: "CREDIT",
        creditCardId: card.id,
        amount: 50,
        date: new Date(),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: { amount: 200 },
      });

      expect(response.statusCode).toBe(422);
      const row = await prisma.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(Number(row.amount)).toBe(50);
    });

    it("returns 404 switching onto a card that doesn't exist", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id, {
        paymentMethod: "DEBIT_PIX",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
        payload: {
          paymentMethod: "credit",
          creditCardId: crypto.randomUUID(),
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /transactions/:id", () => {
    it("deletes a one-time row", async () => {
      const user = await createTestUser();
      const transaction = await createTestTransaction(user.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);
      const row = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });
      expect(row).toBeNull();
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const transaction = await createTestTransaction(owner.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 409 when the row is bill-materialized", async () => {
      const user = await createTestUser();
      const { bill } = await createTestCreditCardWithBill(user.id);
      const transaction = await createTestTransaction(user.id, {
        creditCardBillId: bill.id,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${transaction.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(409);
    });

    it("deletes an installment occurrence forward, keeping earlier ones", async () => {
      const user = await createTestUser();
      const { transactions } = await createTestInstallmentGroup(user.id, {
        count: 4,
        startDate: new Date(Date.UTC(2026, 0, 5)),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${transactions[1].id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);

      const remaining = await prisma.transaction.findMany({
        where: { groupId: transactions[0].groupId ?? undefined },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(transactions[0].id);
    });

    it("deleting a recurring occurrence sets endDate and deletes future occurrences", async () => {
      const user = await createTestUser();
      const { series, transaction: first } = await createTestRecurringSeries(
        user.id,
        { startDate: new Date(Date.UTC(2026, 0, 15)) },
      );
      const second = await createTestTransaction(user.id, {
        timing: "RECURRING",
        recurringSeriesId: series.id,
        date: new Date(Date.UTC(2026, 1, 15)),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/transactions/${first?.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);

      const updatedSeries = await prisma.recurringSeries.findUniqueOrThrow({
        where: { id: series.id },
      });
      expect(updatedSeries.endDate).toEqual(first?.date);

      const secondRow = await prisma.transaction.findUnique({
        where: { id: second.id },
      });
      expect(secondRow).toBeNull();
    });

    it("deleting the first recurring occurrence stops any future occurrence from materializing", async () => {
      const user = await createTestUser();
      const { series, transaction: first } = await createTestRecurringSeries(
        user.id,
        { startDate: new Date(Date.UTC(2026, 0, 15)) },
      );

      await app.inject({
        method: "DELETE",
        url: `/transactions/${first?.id}`,
        headers: await authHeader(user.id),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const occurrences = response
        .json()
        .filter((t: { id: string }) => t.id !== first?.id);
      const seriesTransactions = await prisma.transaction.findMany({
        where: { recurringSeriesId: series.id },
      });
      expect(seriesTransactions).toHaveLength(0);
      expect(occurrences).toHaveLength(0);
    });
  });

  describe("GET /transactions", () => {
    it("returns only rows within the requested month, newest first", async () => {
      const user = await createTestUser();
      const inMonth1 = await createTestTransaction(user.id, {
        date: new Date(Date.UTC(2026, 2, 5)),
        description: "Early",
      });
      const inMonth2 = await createTestTransaction(user.id, {
        date: new Date(Date.UTC(2026, 2, 20)),
        description: "Late",
      });
      await createTestTransaction(user.id, {
        date: new Date(Date.UTC(2026, 3, 1)),
        description: "Next month",
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe(inMonth2.id);
      expect(body[1].id).toBe(inMonth1.id);
    });

    it("materializes an overdue bill as a side effect", async () => {
      const user = await createTestUser();
      const { bill } = await createTestCreditCardWithBill(user.id, {
        cycleMonth: "2026-03",
        closingDate: new Date(Date.UTC(2026, 2, 10)),
        dueDate: new Date(Date.UTC(2026, 2, 20)),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const materialized = await prisma.transaction.findFirst({
        where: { creditCardBillId: bill.id },
      });
      expect(materialized).not.toBeNull();
      expect(
        response.json().some((t: { id: string }) => t.id === materialized?.id),
      ).toBe(true);
    });

    it("materializes a due recurring occurrence as a side effect", async () => {
      const user = await createTestUser();
      const { series } = await createTestRecurringSeries(user.id, {
        startDate: new Date(Date.UTC(2026, 0, 15)),
        materializeFirstOccurrence: false,
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const occurrence = await prisma.transaction.findFirst({
        where: { recurringSeriesId: series.id },
      });
      expect(occurrence).not.toBeNull();
      expect(occurrence?.date).toEqual(new Date(Date.UTC(2026, 2, 15)));
    });

    it("doesn't duplicate materialized rows when called twice", async () => {
      const user = await createTestUser();
      await createTestRecurringSeries(user.id, {
        startDate: new Date(Date.UTC(2026, 0, 15)),
        materializeFirstOccurrence: false,
      });

      await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });
      await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      const count = await prisma.transaction.count({
        where: { userId: user.id },
      });
      expect(count).toBe(1);
    });

    it("excludes other users' transactions", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      await createTestTransaction(otherUser.id, {
        date: new Date(Date.UTC(2026, 2, 5)),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(0);
    });
  });

  describe("GET /transactions/summary", () => {
    it("computes balance = income - spent", async () => {
      const user = await createTestUser();
      await createTestTransaction(user.id, {
        type: "INCOME",
        amount: 500,
        date: new Date(Date.UTC(2026, 2, 5)),
      });
      await createTestTransaction(user.id, {
        type: "EXPENSE",
        paymentMethod: "DEBIT_PIX",
        amount: 200,
        date: new Date(Date.UTC(2026, 2, 10)),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions/summary?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        income: 500,
        spent: 200,
        balance: 300,
      });
    });

    it("excludes card transactions until they materialize", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);
      await createTestTransaction(user.id, {
        type: "EXPENSE",
        paymentMethod: "CREDIT",
        creditCardId: card.id,
        amount: 999,
        date: new Date(Date.UTC(2026, 2, 10)),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions/summary?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().spent).toBe(0);
    });

    it("counts a materialized bill transaction once it hits the balance", async () => {
      const user = await createTestUser();
      await createTestCreditCardWithBill(user.id, {
        cycleMonth: "2026-03",
        closingDate: new Date(Date.UTC(2026, 2, 10)),
        dueDate: new Date(Date.UTC(2026, 2, 20)),
      });

      const response = await app.inject({
        method: "GET",
        url: "/transactions/summary?month=2026-03",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const materialized = await prisma.transaction.findFirst({
        where: { userId: user.id, creditCardBillId: { not: null } },
      });
      expect(materialized).not.toBeNull();
      expect(response.json().spent).toBe(Number(materialized?.amount));
    });
  });
});
