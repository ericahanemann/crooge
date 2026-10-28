import type { CreditCard, Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { cycleDateFilter, getCycleForDate } from "./billing-cycle.ts";

type DbClient = Prisma.TransactionClient | typeof prisma;

/**
 * A bill's amount is always computed from its transactions rather than
 * stored, so it can never drift out of sync. Accepts an optional `client`
 * (a `$transaction` callback's `tx`) so callers recomputing mid-transaction
 * — e.g. `update-transaction.ts` re-checking available credit right after
 * writing the edited row — see their own uncommitted write; defaults to the
 * global client for ordinary reads.
 */
export async function getBillAmount(
  creditCardId: string,
  closingDate: Date,
  client: DbClient = prisma,
): Promise<number> {
  const aggregate = await client.transaction.aggregate({
    _sum: { amount: true },
    where: { creditCardId, date: cycleDateFilter(closingDate) },
  });

  return Number(aggregate._sum.amount ?? 0);
}

/**
 * `getBillAmount` for many of one card's bills in a single query instead of
 * one per bill: fetches every transaction across the combined date range,
 * then sums each bill's own window in memory (in integer cents, so the
 * totals match what a SQL SUM over `Decimal(12,2)` would return). Results
 * are in the same order as `closingDates`.
 */
export async function getBillAmounts(
  creditCardId: string,
  closingDates: Date[],
  client: DbClient = prisma,
): Promise<number[]> {
  if (closingDates.length === 0) return [];

  const windows = closingDates.map(cycleDateFilter);
  const earliest = Math.min(...windows.map((w) => w.gte.getTime()));
  const latest = Math.max(...windows.map((w) => w.lt.getTime()));

  const rows = await client.transaction.findMany({
    where: {
      creditCardId,
      date: { gte: new Date(earliest), lt: new Date(latest) },
    },
    select: { date: true, amount: true },
  });

  return windows.map((window) => {
    let cents = 0;
    for (const row of rows) {
      if (row.date >= window.gte && row.date < window.lt) {
        cents += Math.round(Number(row.amount) * 100);
      }
    }
    return cents / 100;
  });
}

/**
 * "current" means exactly the cycle open today — never more than one bill
 * at a time. An unpaid bill that closed before today's cycle is "overdue"
 * rather than "current": conflating the two let a stale unpaid bill from
 * months ago outrank the real current cycle wherever callers do
 * `bills.find((b) => b.status === "current")`.
 */
export function billStatus(
  bill: { paidAt: Date | null; cycleMonth: string },
  currentCycleMonth: string,
): "paid" | "overdue" | "current" | "future" {
  if (bill.paidAt) return "paid";
  if (bill.cycleMonth === currentCycleMonth) return "current";
  return bill.cycleMonth > currentCycleMonth ? "future" : "overdue";
}

/** `limit` minus whatever's outstanding on the currently open cycle (0 if it's already been paid off). See `getBillAmount` re: the optional `client`. */
export async function getAvailableCredit(
  card: Pick<CreditCard, "id" | "limit" | "closingDay" | "dueDay">,
  client: DbClient = prisma,
): Promise<number> {
  const { cycleMonth, closingDate } = getCycleForDate(
    card.closingDay,
    card.dueDay,
    new Date(),
  );

  const bill = await client.creditCardBill.findUnique({
    where: { creditCardId_cycleMonth: { creditCardId: card.id, cycleMonth } },
  });

  const outstanding = bill?.paidAt
    ? 0
    : await getBillAmount(card.id, closingDate, client);

  return Number(card.limit) - outstanding;
}
