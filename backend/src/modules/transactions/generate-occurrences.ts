import { randomUUID } from "node:crypto";
import type { RecurringFrequency } from "../../generated/prisma/client.ts";

export interface Occurrence {
  date: Date;
  amount: number;
  installmentCurrent?: number;
  installmentTotal?: number;
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
    ),
  );
}

/** Splits `totalAmount` into `count` monthly installments (last one absorbs the rounding remainder so the sum is always exact), one occurrence per month starting at `startDate`. */
export function generateInstallments(
  totalAmount: number,
  count: number,
  startDate: Date,
): { groupId: string; occurrences: Occurrence[] } {
  const groupId = randomUUID();
  const perInstallment = Math.round((totalAmount / count) * 100) / 100;

  let allocated = 0;
  const occurrences: Occurrence[] = [];
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast
      ? Math.round((totalAmount - allocated) * 100) / 100
      : perInstallment;
    allocated += amount;

    occurrences.push({
      date: addMonths(startDate, i),
      amount,
      installmentCurrent: i + 1,
      installmentTotal: count,
    });
  }

  return { groupId, occurrences };
}

const STEP_MONTHS: Record<RecurringFrequency, number> = {
  MONTHLY: 1,
  ANNUAL: 12,
};

/**
 * Whether a recurring series starting at `startDate` (with the given
 * `frequency`) has an occurrence landing in `[rangeStart, rangeEnd)`,
 * computed directly from the rule rather than iterating month by month from
 * `startDate` — cheap regardless of how old the series is or how far out
 * `rangeStart` is. Returns that occurrence's date, or `null` if the range
 * has none.
 *
 * Reuses the exact same `k * stepMonths` step `RecurringSeries` occurrences
 * have always used (see `routes/create-transaction.ts`), so day-of-month
 * drift on short months (e.g. a series starting the 31st) is identical to
 * what direct generation would have produced — not a new quirk.
 */
export function occurrenceInRange(
  startDate: Date,
  frequency: RecurringFrequency,
  rangeStart: Date,
  rangeEnd: Date,
): Date | null {
  const stepMonths = STEP_MONTHS[frequency];
  const monthsToRangeStart =
    (rangeStart.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
    (rangeStart.getUTCMonth() - startDate.getUTCMonth());
  const kEstimate = Math.floor(monthsToRangeStart / stepMonths);

  // addMonths can land a candidate a little earlier/later than the naive
  // estimate expects (day-of-month overflow on short months), so check a
  // small window around it instead of trusting kEstimate exactly.
  for (let k = Math.max(kEstimate - 1, 0); k <= kEstimate + 2; k++) {
    const candidate = addMonths(startDate, k * stepMonths);
    if (candidate >= rangeStart && candidate < rangeEnd) return candidate;
  }
  return null;
}
