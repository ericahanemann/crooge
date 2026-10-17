import type { Prisma } from "../../generated/prisma/client.ts";

export interface BillingCycle {
  cycleMonth: string;
  closingDate: Date;
  dueDate: Date;
}

/**
 * Whether `dueDay` falls in the same calendar month as `closingDay`, or the
 * month after. Inferred from the day numbers alone (no separate field):
 * `dueDay > closingDay` means the due date is later in the same month
 * (e.g. closes the 4th, due the 11th); otherwise it's the analogous day of
 * the next month (e.g. closes the 20th, due the 10th). This covers the
 * common real-world patterns; it would only misfire for a due date 2+
 * months after closing, which issuers don't do in practice.
 */
function dueDateForClosing(
  closingDate: Date,
  closingDay: number,
  dueDay: number,
): Date {
  const sameMonth = dueDay > closingDay;
  let dueMonthIndex = closingDate.getUTCMonth() + (sameMonth ? 0 : 1);
  let dueYear = closingDate.getUTCFullYear();
  if (dueMonthIndex > 11) {
    dueMonthIndex = 0;
    dueYear += 1;
  }
  return new Date(Date.UTC(dueYear, dueMonthIndex, dueDay));
}

/**
 * A purchase made before `closingDay` of a month belongs to the cycle that
 * closes that month; made on or after it, the cycle has already closed for
 * the day, so it rolls into next month's cycle. `cycleMonth` is keyed by the
 * closing month (this becomes the API's `CreditCardBill.month` field).
 */
export function getCycleForDate(
  closingDay: number,
  dueDay: number,
  date: Date,
): BillingCycle {
  const day = date.getUTCDate();
  let cycleYear = date.getUTCFullYear();
  let cycleMonthIndex = date.getUTCMonth();

  if (day >= closingDay) {
    cycleMonthIndex += 1;
    if (cycleMonthIndex > 11) {
      cycleMonthIndex = 0;
      cycleYear += 1;
    }
  }

  const closingDate = new Date(
    Date.UTC(cycleYear, cycleMonthIndex, closingDay),
  );

  const dueDate = dueDateForClosing(closingDate, closingDay, dueDay);

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

/** Re-derives `closingDate`/`dueDate` for an already-keyed cycle under a (possibly just-edited) closing/due day — used to refresh unpaid `CreditCardBill` rows after a schedule edit, without re-keying which transactions belong to which cycle. */
export function datesForCycleMonth(
  closingDay: number,
  dueDay: number,
  cycleMonth: string,
): { closingDate: Date; dueDate: Date } {
  const closingDate = closingDateForCycleMonth(closingDay, cycleMonth);
  const dueDate = dueDateForClosing(closingDate, closingDay, dueDay);
  return { closingDate, dueDate };
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
