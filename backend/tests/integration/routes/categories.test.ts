import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/app.ts";
import { createTestCategory, createTestUser } from "../../setup/factories.ts";
import { prisma, resetDatabase } from "../../setup/test-db.ts";

async function authHeader(userId: string) {
  return { authorization: `Bearer ${app.jwt.sign({ sub: userId })}` };
}

describe("categories routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /categories", () => {
    it("creates an expense category", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "expense", label: "Travel", icon: "plane" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        kind: "expense",
        label: "Travel",
        icon: "plane",
        isFallback: false,
        isSystem: false,
      });
    });

    it("creates an income category", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "income", label: "Salary", icon: "briefcase" },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        kind: "income",
        label: "Salary",
      });
    });

    it("ignores client-sent isFallback/isSystem", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: {
          kind: "expense",
          label: "Travel",
          icon: "plane",
          isFallback: true,
          isSystem: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const row = await prisma.category.findUniqueOrThrow({
        where: { id: response.json().id },
      });
      expect(row.isFallback).toBe(false);
      expect(row.isSystem).toBe(false);
    });

    it("rejects a duplicate [userId, kind, label] with 409", async () => {
      const user = await createTestUser();
      await createTestCategory(user.id, { kind: "EXPENSE", label: "Travel" });

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "expense", label: "Travel", icon: "plane" },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        message: "category already exists",
      });
    });

    it("allows the same label across different kinds", async () => {
      const user = await createTestUser();
      await createTestCategory(user.id, { kind: "EXPENSE", label: "Travel" });

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "income", label: "Travel", icon: "plane" },
      });

      expect(response.statusCode).toBe(201);
    });

    it("allows the same label across different users", async () => {
      const userA = await createTestUser();
      const userB = await createTestUser();
      await createTestCategory(userA.id, { kind: "EXPENSE", label: "Travel" });

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(userB.id),
        payload: { kind: "expense", label: "Travel", icon: "plane" },
      });

      expect(response.statusCode).toBe(201);
    });

    it("rejects a blank label with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "expense", label: "   ", icon: "plane" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects an invalid icon with 400", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "POST",
        url: "/categories",
        headers: await authHeader(user.id),
        payload: { kind: "expense", label: "Travel", icon: "not-a-real-icon" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("PATCH /categories/:id", () => {
    it("renames label and icon", async () => {
      const user = await createTestUser();
      const category = await createTestCategory(user.id, { label: "Old" });

      const response = await app.inject({
        method: "PATCH",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
        payload: { label: "New", icon: "coffee" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ label: "New", icon: "coffee" });
    });

    it("returns 404 when the category doesn't exist", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "PATCH",
        url: `/categories/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
        payload: { label: "New", icon: "coffee" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when the category belongs to another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const category = await createTestCategory(owner.id);

      const response = await app.inject({
        method: "PATCH",
        url: `/categories/${category.id}`,
        headers: await authHeader(attacker.id),
        payload: { label: "New", icon: "coffee" },
      });

      expect(response.statusCode).toBe(404);
      const stillOwned = await prisma.category.findUniqueOrThrow({
        where: { id: category.id },
      });
      expect(stillOwned.label).toBe(category.label);
    });

    it("rejects a rename that collides with another of the caller's categories with 409", async () => {
      const user = await createTestUser();
      await createTestCategory(user.id, { kind: "EXPENSE", label: "Taken" });
      const category = await createTestCategory(user.id, {
        kind: "EXPENSE",
        label: "Original",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
        payload: { label: "Taken", icon: "coffee" },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("DELETE /categories/:id", () => {
    it("deletes a plain custom category", async () => {
      const user = await createTestUser();
      const category = await createTestCategory(user.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);
      const row = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(row).toBeNull();
    });

    it("returns 404 when the category doesn't exist", async () => {
      const user = await createTestUser();

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${crypto.randomUUID()}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when the category belongs to another user", async () => {
      const owner = await createTestUser();
      const attacker = await createTestUser();
      const category = await createTestCategory(owner.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(attacker.id),
      });

      expect(response.statusCode).toBe(404);
      const stillThere = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(stillThere).not.toBeNull();
    });

    it("rejects deleting the fallback category with 409", async () => {
      const user = await createTestUser();
      const category = await createTestCategory(user.id, { isFallback: true });

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(409);
    });

    it("rejects deleting a system category with 409", async () => {
      const user = await createTestUser();
      const category = await createTestCategory(user.id, { isSystem: true });

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(409);
    });

    it("reassigns referencing transactions and recurring series to the fallback category", async () => {
      const user = await createTestUser();
      const fallback = await createTestCategory(user.id, {
        kind: "EXPENSE",
        isFallback: true,
      });
      const category = await createTestCategory(user.id, { kind: "EXPENSE" });

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          category: category.id,
          description: "Groceries",
          amount: 50,
          date: new Date(),
          timing: "ONE_TIME",
        },
      });
      const series = await prisma.recurringSeries.create({
        data: {
          userId: user.id,
          category: category.id,
          description: "Rent",
          amount: 1000,
          frequency: "MONTHLY",
          startDate: new Date(),
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);

      const reassignedTransaction = await prisma.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(reassignedTransaction.category).toBe(fallback.id);

      const reassignedSeries = await prisma.recurringSeries.findUniqueOrThrow({
        where: { id: series.id },
      });
      expect(reassignedSeries.category).toBe(fallback.id);
    });

    it("creates a fallback category on the fly and reassigns to it when the user has none yet", async () => {
      const user = await createTestUser();
      const category = await createTestCategory(user.id, { kind: "EXPENSE" });
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: "EXPENSE",
          category: category.id,
          description: "Groceries",
          amount: 50,
          date: new Date(),
          timing: "ONE_TIME",
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/categories/${category.id}`,
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(204);

      const newFallback = await prisma.category.findFirstOrThrow({
        where: { userId: user.id, kind: "EXPENSE", isFallback: true },
      });
      const reassigned = await prisma.transaction.findUniqueOrThrow({
        where: { id: transaction.id },
      });
      expect(reassigned.category).toBe(newFallback.id);
    });
  });

  describe("GET /categories", () => {
    it("lists only the caller's categories", async () => {
      const user = await createTestUser();
      const otherUser = await createTestUser();
      await createTestCategory(user.id, { label: "Mine" });
      await createTestCategory(otherUser.id, { label: "Not mine" });

      const response = await app.inject({
        method: "GET",
        url: "/categories",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].label).toBe("Mine");
    });

    it("filters by kind", async () => {
      const user = await createTestUser();
      await createTestCategory(user.id, { kind: "EXPENSE", label: "Food" });
      await createTestCategory(user.id, { kind: "INCOME", label: "Salary" });

      const response = await app.inject({
        method: "GET",
        url: "/categories?kind=income",
        headers: await authHeader(user.id),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(1);
      expect(body[0].label).toBe("Salary");
    });
  });
});
