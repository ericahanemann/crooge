import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/app.ts";
import { getCycleForDate } from "../../../src/modules/credit-cards/billing-cycle.ts";
import {
  createTestCreditCard,
  createTestCreditCardWithBill,
  createTestTransaction,
  createTestUser,
} from "../../setup/factories.ts";
import { prisma, resetDatabase } from "../../setup/test-db.ts";

async function authHeader(userId: string) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

function nextCycleMonth(cycleMonth: string, monthsAhead: number): string {
  const [year, month] = cycleMonth.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, month - 1 + monthsAhead, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("credit cards routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /credit-cards", () => {
    it("creates a card with full available credit", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/credit-cards",
        headers: await authHeader(user.id),
        payload: {
          name: "Nubank",
          brand: "mastercard",
          limit: 2000,
          closingDay: 10,
          dueDay: 20,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        name: "Nubank",
        brand: "mastercard",
        limit: 2000,
        available: 2000,
      });
    });

    it("ensures a CreditCardBill row for the current cycle", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/credit-cards",
        headers: await authHeader(user.id),
        payload: {
          name: "Nubank",
          brand: "visa",
          limit: 2000,
          closingDay: 10,
          dueDay: 20,
        },
      });

      const cardId = response.json().id;
      const bill = await prisma.creditCardBill.findFirst({
        where: { creditCardId: cardId },
      });
      expect(bill).not.toBeNull();
    });

    it("rejects invalid limit/closingDay/dueDay with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/credit-cards",
        headers: await authHeader(user.id),
        payload: {
          name: "Nubank",
          brand: "visa",
          limit: -1,
          closingDay: 40,
          dueDay: 40,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("PATCH /credit-cards/:id", () => {
    it("updates a card's fields", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { name: "Old name" });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
        payload: {
          name: "New name",
          brand: "amex",
          limit: 500,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        name: "New name",
        brand: "amex",
      });
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
        payload: {
          name: "X",
          brand: "visa",
          limit: 1,
          closingDay: 1,
          dueDay: 2,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(attacker.id),
        payload: {
          name: "X",
          brand: "visa",
          limit: 1,
          closingDay: 1,
          dueDay: 2,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when the card is archived", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        archivedAt: new Date(),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
        payload: {
          name: "X",
          brand: "visa",
          limit: 1,
          closingDay: 1,
          dueDay: 2,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("doesn't re-key existing bills when closingDay/dueDay change, but refreshes an unpaid bill's stored dates", async () => {
      const user = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(user.id, {
        card: { closingDay: 10, dueDay: 20 },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
        payload: {
          name: card.name,
          brand: "visa",
          limit: Number(card.limit),
          closingDay: 5,
          dueDay: 15,
        },
      });

      expect(response.statusCode).toBe(200);
      const updatedBill = await prisma.creditCardBill.findUniqueOrThrow({
        where: { id: bill.id },
      });
      expect(updatedBill.cycleMonth).toBe(bill.cycleMonth);
      const [year, month] = bill.cycleMonth.split("-").map(Number) as [
        number,
        number,
      ];
      expect(updatedBill.closingDate).toEqual(
        new Date(Date.UTC(year, month - 1, 5)),
      );
      expect(updatedBill.dueDate).toEqual(
        new Date(Date.UTC(year, month - 1, 15)),
      );
    });

    it("leaves a paid bill's stored dates untouched when closingDay/dueDay change", async () => {
      const user = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(user.id, {
        card: { closingDay: 10, dueDay: 20 },
        paidAt: new Date(),
        paidAmount: 0,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
        payload: {
          name: card.name,
          brand: "visa",
          limit: Number(card.limit),
          closingDay: 5,
          dueDay: 15,
        },
      });

      expect(response.statusCode).toBe(200);
      const unchangedBill = await prisma.creditCardBill.findUniqueOrThrow({
        where: { id: bill.id },
      });
      expect(unchangedBill.closingDate).toEqual(bill.closingDate);
      expect(unchangedBill.dueDate).toEqual(bill.dueDate);
    });
  });

  describe("DELETE /credit-cards/:id", () => {
    it("archives a card with no outstanding balance", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);
      const row = await prisma.creditCard.findUniqueOrThrow({
        where: { id: card.id },
      });
      expect(row.archivedAt).not.toBeNull();
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 409 when the current cycle has an unpaid balance", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, { limit: 1000 });
      await createTestTransaction(user.id, {
        creditCardId: card.id,
        amount: 100,
        date: new Date(),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(409);
    });

    it("is idempotent: re-archiving an already-archived card returns 204", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);

      const first = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });
      expect(first.statusCode).toBe(204);

      const second = await app.inject({
        method: "DELETE",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });
      expect(second.statusCode).toBe(204);
    });
  });

  describe("GET /credit-cards/:id", () => {
    it("returns card detail with currentBill and upcomingBillsCount", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.currentBill).toMatchObject({ status: expect.any(String) });
      expect(body.upcomingBillsCount).toBe(0);
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("still reports today's live cycle as currentBill even with an old unpaid bill sitting around", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 10,
        dueDay: 20,
      });
      const current = getCycleForDate(card.closingDay, card.dueDay, new Date());

      // a bill from 2 cycles ago that was never paid off
      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: nextCycleMonth(current.cycleMonth, -2),
          closingDate: new Date(),
          dueDate: new Date(),
          paidAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().currentBill).toMatchObject({
        month: current.cycleMonth,
        status: "current",
      });
    });

    it("is reachable for an archived card", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        archivedAt: new Date(),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
    });

    it("excludes paid future bills from upcomingBillsCount", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 10,
        dueDay: 20,
      });
      const current = getCycleForDate(card.closingDay, card.dueDay, new Date());

      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: nextCycleMonth(current.cycleMonth, 1),
          closingDate: new Date(),
          dueDate: new Date(),
          paidAt: null,
        },
      });
      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: nextCycleMonth(current.cycleMonth, 2),
          closingDate: new Date(),
          dueDate: new Date(),
          paidAt: new Date(),
          paidAmount: 0,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().upcomingBillsCount).toBe(1);
    });
  });

  describe("GET /credit-cards", () => {
    it("lists only non-archived cards for the caller", async () => {
      const user = await createTestUser();
      const activeCard = await createTestCreditCard(user.id, {
        name: "Active",
      });
      await createTestCreditCard(user.id, {
        name: "Archived",
        archivedAt: new Date(),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/credit-cards",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(activeCard.id);
    });

    it("excludes other users' cards", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      await createTestCreditCard(otherUser.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/credit-cards",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(0);
    });
  });

  describe("GET /credit-cards/:id/bills", () => {
    it("returns default pagination", async () => {
      const user = await createTestUser();
      const { card } = await createTestCreditCardWithBill(user.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/bills`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(12);
      expect(body.total).toBeGreaterThanOrEqual(1);
    });

    it("rejects pageSize above 60 with 400", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/bills?pageSize=61`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${crypto.randomUUID()}/bills`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/bills`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("reflects paid/overdue/current/future status per bill", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 10,
        dueDay: 20,
      });
      const current = getCycleForDate(card.closingDay, card.dueDay, new Date());

      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: nextCycleMonth(current.cycleMonth, 1),
          closingDate: new Date(),
          dueDate: new Date(),
          paidAt: null,
        },
      });
      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: current.cycleMonth,
          closingDate: current.closingDate,
          dueDate: current.dueDate,
          paidAt: new Date(),
          paidAmount: 0,
        },
      });
      await prisma.creditCardBill.create({
        data: {
          creditCardId: card.id,
          cycleMonth: nextCycleMonth(current.cycleMonth, -1),
          closingDate: new Date(),
          dueDate: new Date(),
          paidAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/bills`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const statuses = response
        .json()
        .items.map((item: { status: string }) => item.status);
      expect(statuses).toContain("future");
      expect(statuses).toContain("paid");
      expect(statuses).toContain("overdue");
    });
  });

  describe("GET /credit-cards/:id/transactions", () => {
    it("returns only transactions within the requested billing cycle", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        closingDay: 10,
        dueDay: 20,
      });
      const cycle = getCycleForDate(card.closingDay, card.dueDay, new Date());

      const lastDayOfCycle = new Date(
        Date.UTC(
          cycle.closingDate.getUTCFullYear(),
          cycle.closingDate.getUTCMonth(),
          cycle.closingDate.getUTCDate() - 1,
        ),
      );
      const inCycle = await createTestTransaction(user.id, {
        creditCardId: card.id,
        date: lastDayOfCycle,
      });
      const nextMonthDate = new Date(
        Date.UTC(
          cycle.closingDate.getUTCFullYear(),
          cycle.closingDate.getUTCMonth() + 1,
          cycle.closingDate.getUTCDate() + 1,
        ),
      );
      await createTestTransaction(user.id, {
        creditCardId: card.id,
        date: nextMonthDate,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/transactions?month=${cycle.cycleMonth}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(inCycle.id);
    });

    it("returns 404 when not found", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${crypto.randomUUID()}/transactions?month=2026-01`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const card = await createTestCreditCard(owner.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/transactions?month=2026-01`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /credit-cards/:id/bills/:month/pay", () => {
    it("pays the computed bill amount", async () => {
      const user = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(user.id, {
        card: { closingDay: 10, dueDay: 20 },
      });
      const cycle = { cycleMonth: bill.cycleMonth };
      await createTestTransaction(user.id, {
        creditCardId: card.id,
        amount: 100,
        date: new Date(),
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/${cycle.cycleMonth}/pay`,
        headers: await authHeader(user.id),
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ status: "paid", amount: 100 });

      const materialized = await prisma.transaction.findFirst({
        where: { userId: user.id, creditCardBillId: { not: null } },
      });
      expect(materialized).not.toBeNull();
    });

    it("pays a caller-supplied amount override", async () => {
      const user = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(user.id, {
        card: { closingDay: 10, dueDay: 20 },
      });
      const cycle = { cycleMonth: bill.cycleMonth };

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/${cycle.cycleMonth}/pay`,
        headers: await authHeader(user.id),
        payload: { amount: 42 },
      });

      expect(response.statusCode).toBe(200);
      const paidBill = await prisma.creditCardBill.findFirstOrThrow({
        where: { creditCardId: card.id, cycleMonth: cycle.cycleMonth },
      });
      expect(Number(paidBill.paidAmount)).toBe(42);
    });

    it("returns 404 when the bill doesn't exist", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/1999-01/pay`,
        headers: await authHeader(user.id),
        payload: {},
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when owned by another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(owner.id, {
        card: { closingDay: 10, dueDay: 20 },
      });
      const cycle = { cycleMonth: bill.cycleMonth };

      const response = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/${cycle.cycleMonth}/pay`,
        headers: await authHeader(attacker.id),
        payload: {},
      });

      expect(response.statusCode).toBe(404);
      const stillUnpaid = await prisma.creditCardBill.findUniqueOrThrow({
        where: { id: bill.id },
      });
      expect(stillUnpaid.paidAt).toBeNull();
    });

    it("returns 409 when the bill is already paid", async () => {
      const user = await createTestUser();
      const { card, bill } = await createTestCreditCardWithBill(user.id, {
        card: { closingDay: 10, dueDay: 20 },
      });
      const cycle = { cycleMonth: bill.cycleMonth };

      const first = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/${cycle.cycleMonth}/pay`,
        headers: await authHeader(user.id),
        payload: {},
      });
      expect(first.statusCode).toBe(200);

      const second = await app.inject({
        method: "POST",
        url: `/api/v1/credit-cards/${card.id}/bills/${cycle.cycleMonth}/pay`,
        headers: await authHeader(user.id),
        payload: {},
      });
      expect(second.statusCode).toBe(409);
    });
  });

  // Regression: `getCycleForDate` rolls a purchase made ON the closing day
  // into the next bill, but bill amounts and the per-cycle transaction list
  // used to window cycles as (previous closing, closing] — so that same
  // purchase still showed up on, and was charged to, the bill that closed.
  describe("closing-day boundary", () => {
    it("bills and lists a purchase made on the closing day under the next cycle, everywhere", async () => {
      const user = await createTestUser();
      const card = await createTestCreditCard(user.id, {
        limit: 10_000,
        closingDay: 4,
        dueDay: 10,
      });
      const headers = await authHeader(user.id);

      for (const [date, amount] of [
        ["2027-03-03", 10],
        ["2027-03-04", 100],
      ] as const) {
        const created = await app.inject({
          method: "POST",
          url: "/api/v1/transactions",
          headers,
          payload: {
            type: "expense",
            description: `bought ${date}`,
            amount,
            date,
            category: "shopping",
            paymentMethod: "credit",
            creditCardId: card.id,
          },
        });
        expect(created.statusCode).toBe(201);
      }

      const listFor = async (month: string) => {
        const response = await app.inject({
          method: "GET",
          url: `/api/v1/credit-cards/${card.id}/transactions?month=${month}`,
          headers,
        });
        expect(response.statusCode).toBe(200);
        return (response.json() as { date: string }[]).map((t) => t.date);
      };
      expect(await listFor("2027-03")).toEqual(["2027-03-03"]);
      expect(await listFor("2027-04")).toEqual(["2027-03-04"]);

      const bills = await app.inject({
        method: "GET",
        url: `/api/v1/credit-cards/${card.id}/bills`,
        headers,
      });
      const byMonth = Object.fromEntries(
        (
          bills.json() as { items: { month: string; amount: number }[] }
        ).items.map((bill) => [bill.month, bill.amount]),
      );
      expect(byMonth["2027-03"]).toBe(10);
      expect(byMonth["2027-04"]).toBe(100);
    });
  });
});
