import { hash } from "@node-rs/argon2";
import { getCycleForDate } from "../../src/modules/credit-cards/billing-cycle.ts";
import { prisma } from "./test-db.ts";

/**
 * A password that would also pass `register-user.ts`'s complexity rule, for
 * tests that log in with it afterward. A plain literal, deliberately — it
 * only ever authenticates against a disposable Testcontainers Postgres that
 * doesn't exist outside the test run, so there's no real credential here to
 * protect. GitGuardian's PR check still flags it (its "Generic Password"
 * detector triggers on the password-context *shape*, not on whether the
 * value is guessable or secret) — resolved as a false positive/test
 * credential in the GitGuardian dashboard rather than obscured in code.
 */
export const TEST_USER_PASSWORD = "correct-horse-battery-1!";

export async function createTestUser(
  overrides: { name?: string; email?: string; password?: string } = {},
) {
  const password = overrides.password ?? TEST_USER_PASSWORD;
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.test`,
      password: await hash(password),
    },
  });
}

export async function createTestCategory(
  userId: string,
  overrides: {
    kind?: "EXPENSE" | "INCOME";
    label?: string;
    icon?: string;
    isFallback?: boolean;
    isSystem?: boolean;
  } = {},
) {
  return prisma.category.create({
    data: {
      userId,
      kind: overrides.kind ?? "EXPENSE",
      label: overrides.label ?? `Category ${crypto.randomUUID()}`,
      icon: overrides.icon ?? "tag",
      isFallback: overrides.isFallback ?? false,
      isSystem: overrides.isSystem ?? false,
    },
  });
}

export async function createTestCreditCard(
  userId: string,
  overrides: {
    name?: string;
    brand?: "VISA" | "MASTERCARD" | "AMEX" | "ELO";
    limit?: number;
    closingDay?: number;
    dueDay?: number;
    archivedAt?: Date | null;
  } = {},
) {
  return prisma.creditCard.create({
    data: {
      userId,
      name: overrides.name ?? "Test Card",
      brand: overrides.brand ?? "VISA",
      limit: overrides.limit ?? 1000,
      closingDay: overrides.closingDay ?? 10,
      dueDay: overrides.dueDay ?? 20,
      archivedAt: overrides.archivedAt ?? null,
    },
  });
}

/**
 * Creates a card plus one explicit `CreditCardBill` row for a given cycle —
 * for tests that need direct control over `paidAt`/`cycleMonth`/dates
 * (archiving-with-paid-bill, double-payment, bill pagination/status). For
 * plain "reduce available credit" scenarios, prefer a card plus
 * `createTestTransaction({ creditCardId })` instead — `getAvailableCredit`
 * computes from transactions, not from this row's stored fields.
 */
export async function createTestCreditCardWithBill(
  userId: string,
  overrides: {
    card?: Parameters<typeof createTestCreditCard>[1];
    cycleMonth?: string;
    closingDate?: Date;
    dueDate?: Date;
    paidAt?: Date | null;
    paidAmount?: number | null;
  } = {},
) {
  const card = await createTestCreditCard(userId, overrides.card);
  const defaultCycle = getCycleForDate(
    card.closingDay,
    card.dueDay,
    new Date(),
  );

  const bill = await prisma.creditCardBill.create({
    data: {
      creditCardId: card.id,
      cycleMonth: overrides.cycleMonth ?? defaultCycle.cycleMonth,
      closingDate: overrides.closingDate ?? defaultCycle.closingDate,
      dueDate: overrides.dueDate ?? defaultCycle.dueDate,
      paidAt: overrides.paidAt ?? null,
      paidAmount: overrides.paidAmount ?? null,
    },
  });

  return { card, bill };
}

export async function createTestTransaction(
  userId: string,
  overrides: {
    type?: "INCOME" | "EXPENSE";
    category?: string;
    description?: string;
    amount?: number;
    date?: Date;
    timing?: "ONE_TIME" | "INSTALLMENT" | "RECURRING";
    paymentMethod?: "DEBIT_PIX" | "CREDIT" | null;
    creditCardId?: string | null;
    creditCardBillId?: string | null;
    groupId?: string | null;
    installmentCurrent?: number | null;
    installmentTotal?: number | null;
    recurringSeriesId?: string | null;
  } = {},
) {
  return prisma.transaction.create({
    data: {
      userId,
      type: overrides.type ?? "EXPENSE",
      category: overrides.category ?? "uncategorized",
      description: overrides.description ?? "Test transaction",
      amount: overrides.amount ?? 100,
      date: overrides.date ?? new Date(),
      timing: overrides.timing ?? "ONE_TIME",
      paymentMethod: overrides.paymentMethod ?? null,
      creditCardId: overrides.creditCardId ?? null,
      creditCardBillId: overrides.creditCardBillId ?? null,
      groupId: overrides.groupId ?? null,
      installmentCurrent: overrides.installmentCurrent ?? null,
      installmentTotal: overrides.installmentTotal ?? null,
      recurringSeriesId: overrides.recurringSeriesId ?? null,
    },
  });
}

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
    ),
  );
}

/** Builds N installment rows sharing one groupId, for delete-cascade tests. */
export async function createTestInstallmentGroup(
  userId: string,
  overrides: {
    count?: number;
    totalAmount?: number;
    startDate?: Date;
    category?: string;
    creditCardId?: string | null;
    paymentMethod?: "DEBIT_PIX" | "CREDIT" | null;
  } = {},
) {
  const count = overrides.count ?? 3;
  const totalAmount = overrides.totalAmount ?? 300;
  const startDate = overrides.startDate ?? new Date();
  const groupId = crypto.randomUUID();

  const transactions = [];
  for (let i = 0; i < count; i++) {
    transactions.push(
      await createTestTransaction(userId, {
        timing: "INSTALLMENT",
        groupId,
        installmentCurrent: i + 1,
        installmentTotal: count,
        amount: totalAmount / count,
        date: addMonthsUTC(startDate, i),
        category: overrides.category ?? "uncategorized",
        creditCardId: overrides.creditCardId ?? null,
        paymentMethod: overrides.paymentMethod ?? null,
      }),
    );
  }

  return { groupId, transactions };
}

/** Builds a RecurringSeries plus (by default) its first materialized occurrence, for delete/materialize tests. */
export async function createTestRecurringSeries(
  userId: string,
  overrides: {
    category?: string;
    description?: string;
    amount?: number;
    frequency?: "MONTHLY" | "ANNUAL";
    paymentMethod?: "DEBIT_PIX" | "CREDIT" | null;
    creditCardId?: string | null;
    startDate?: Date;
    endDate?: Date | null;
    materializeFirstOccurrence?: boolean;
  } = {},
) {
  const series = await prisma.recurringSeries.create({
    data: {
      userId,
      category: overrides.category ?? "uncategorized",
      description: overrides.description ?? "Test recurring",
      amount: overrides.amount ?? 50,
      frequency: overrides.frequency ?? "MONTHLY",
      paymentMethod: overrides.paymentMethod ?? "DEBIT_PIX",
      creditCardId: overrides.creditCardId ?? null,
      startDate: overrides.startDate ?? new Date(),
      endDate: overrides.endDate ?? null,
    },
  });

  let transaction = null;
  if (overrides.materializeFirstOccurrence ?? true) {
    transaction = await createTestTransaction(userId, {
      timing: "RECURRING",
      recurringSeriesId: series.id,
      date: series.startDate,
      amount: Number(series.amount),
      category: series.category,
      paymentMethod: series.paymentMethod,
      creditCardId: series.creditCardId,
    });
  }

  return { series, transaction };
}
