import type { Prisma } from "../generated/prisma/client.ts";

export interface BillingCycle {
  cycleMonth: string;
  closingDate: Date;
  dueDate: Date;
}

/**
 * A purchase made on or before `closingDay` of a month belongs to the cycle
 * that closes that month; made after it, it rolls into next month's cycle.
 * `cycleMonth` is keyed by the closing month (matches the mock data's
 * `bills[].month` convention).
 */
export function getCycleForDate(
  closingDay: number,
  dueDay: number,
  date: Date,
): BillingCycle {
  const day = date.getUTCDate();
  let cycleYear = date.getUTCFullYear();
  let cycleMonthIndex = date.getUTCMonth();

  if (day > closingDay) {
    cycleMonthIndex += 1;
    if (cycleMonthIndex > 11) {
      cycleMonthIndex = 0;
      cycleYear += 1;
    }
  }

  const closingDate = new Date(
    Date.UTC(cycleYear, cycleMonthIndex, closingDay),
  );

  let dueMonthIndex = cycleMonthIndex + 1;
  let dueYear = cycleYear;
  if (dueMonthIndex > 11) {
    dueMonthIndex = 0;
    dueYear += 1;
  }
  const dueDate = new Date(Date.UTC(dueYear, dueMonthIndex, dueDay));

  const cycleMonth = `${cycleYear}-${String(cycleMonthIndex + 1).padStart(2, "0")}`;

  return { cycleMonth, closingDate, dueDate };
}

/** Start of the cycle ending at `closingDate` (exclusive) — the previous cycle's closing date, since cycles are always exactly one calendar month apart. */
export function previousClosingDate(closingDate: Date): Date {
  return new Date(
    Date.UTC(
      closingDate.getUTCFullYear(),
      closingDate.getUTCMonth() - 1,
      closingDate.getUTCDate(),
    ),
  );
}

/** Inverse of the `cycleMonth` half of `getCycleForDate`: given a "YYYY-MM" key, the closing date of that cycle. */
export function closingDateForCycleMonth(
  closingDay: number,
  cycleMonth: string,
): Date {
  const [year, month] = cycleMonth.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, month - 1, closingDay));
}

/** Upserts the `CreditCardBill` row for whichever cycle `date` falls into, so it always exists to hold `paidAt`/`paidAmount`. */
export async function ensureBill(
  tx: Prisma.TransactionClient,
  creditCardId: string,
  closingDay: number,
  dueDay: number,
  date: Date,
) {
  const { cycleMonth, closingDate, dueDate } = getCycleForDate(
    closingDay,
    dueDay,
    date,
  );

  return tx.creditCardBill.upsert({
    where: { creditCardId_cycleMonth: { creditCardId, cycleMonth } },
    update: {},
    create: { creditCardId, cycleMonth, closingDate, dueDate },
  });
}
