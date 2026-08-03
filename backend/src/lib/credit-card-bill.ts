import type { CreditCard } from "../generated/prisma/client.ts";
import { getCycleForDate, previousClosingDate } from "./billing-cycle.ts";
import { prisma } from "./prisma.ts";

/** A bill's amount is always computed from its transactions rather than stored, so it can never drift out of sync. */
export async function getBillAmount(
  creditCardId: string,
  closingDate: Date,
): Promise<number> {
  const start = previousClosingDate(closingDate);

  const aggregate = await prisma.transaction.aggregate({
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

/** `limit` minus whatever's outstanding on the currently open cycle (0 if it's already been paid off). */
export async function getAvailableCredit(
  card: Pick<CreditCard, "id" | "limit" | "closingDay" | "dueDay">,
): Promise<number> {
  const { cycleMonth, closingDate } = getCycleForDate(
    card.closingDay,
    card.dueDay,
    new Date(),
  );

  const bill = await prisma.creditCardBill.findUnique({
    where: { creditCardId_cycleMonth: { creditCardId: card.id, cycleMonth } },
  });

  const outstanding = bill?.paidAt
    ? 0
    : await getBillAmount(card.id, closingDate);

  return Number(card.limit) - outstanding;
}
