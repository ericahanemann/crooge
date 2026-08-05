import { randomUUID } from "node:crypto";

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

/**
 * No cron infra yet, so a recurring transaction materializes a fixed
 * horizon of future occurrences upfront instead of one row + a scheduled
 * job. Known limit: the series stops appearing once the horizon is
 * exhausted, until a follow-up "top up recurring series" job exists.
 */
const RECURRING_HORIZON = { MONTHLY: 12, ANNUAL: 3 } as const;

export function generateRecurring(
  amount: number,
  frequency: keyof typeof RECURRING_HORIZON,
  startDate: Date,
): { groupId: string; occurrences: Occurrence[] } {
  const groupId = randomUUID();
  const count = RECURRING_HORIZON[frequency];
  const stepMonths = frequency === "MONTHLY" ? 1 : 12;

  const occurrences: Occurrence[] = Array.from({ length: count }, (_, i) => ({
    date: addMonths(startDate, i * stepMonths),
    amount,
  }));

  return { groupId, occurrences };
}
