import type { CreditCard, Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { getCycleForDate, previousClosingDate } from "./billing-cycle.ts";

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
  const start = previousClosingDate(closingDate);

  const aggregate = await client.transaction.aggregate({
    _sum: { amount: true },
    where: {
      creditCardId,
      date: { gt: start, lte: closingDate },
    },
  });

  return Number(aggregate._sum.amount ?? 0);
}

/** Bills that closed before the current cycle but were never paid collapse into "current" — the frontend only models paid/current/future. */
export function billStatus(
  bill: { paidAt: Date | null; cycleMonth: string },
  currentCycleMonth: string,
): "paid" | "current" | "future" {
  if (bill.paidAt) return "paid";
  return bill.cycleMonth > currentCycleMonth ? "future" : "current";
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
