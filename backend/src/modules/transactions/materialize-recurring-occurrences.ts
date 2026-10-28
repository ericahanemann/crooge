import { prisma } from "../../lib/prisma.ts";
import { ensureBills } from "../credit-cards/billing-cycle.ts";
import { occurrenceInRange } from "./generate-occurrences.ts";

/**
 * Lazily materializes recurring-series occurrences for one date range: for
 * each of the caller's active `RecurringSeries`, checks whether it has an
 * occurrence landing in `[rangeStart, rangeEnd)` and, if so and it isn't
 * already a real row, creates it. No cron infra exists, so this runs inline
 * at the top of the read endpoints whose response depends on it
 * (`GET /transactions`, `GET /transactions/summary`) — the same
 * "compute on next read" pattern already used for overdue credit card bills,
 * see `credit-cards/materialize-bill-transaction.ts#materializeOverdueBills`.
 *
 * Unlike that pattern (and unlike this function's predecessor, which
 * extended a series by a fixed-size batch), this never walks forward from a
 * prior occurrence — `occurrenceInRange` computes directly from the series'
 * rule, so materializing a month is O(1) regardless of how old the series is
 * or how far in the future the requested range is, and out-of-order access
 * (jumping straight to a future month, then later visiting a skipped one)
 * works correctly.
 *
 * Both `GET /transactions` and `GET /transactions/summary` call this for the
 * same month, and the Monthly page's RSC streaming fetches each section's
 * data independently — so two calls for the same series/date can genuinely
 * race on separate connections. The insert skips rows that collide with
 * `Transaction`'s `(recurringSeriesId, date)` unique constraint, so the
 * existence lookup below is only a fast path — the loser of a race is a
 * no-op, not an error.
 *
 * Query count doesn't grow with the number of series: one series lookup,
 * one existence lookup, and only if something is actually missing, one
 * transaction with one bill insert per card plus one row insert. This runs
 * on every Monthly page load, so a per-series round trip here was paid by
 * every page view.
 *
 * A series canceled via "delete from here forward"
 * (`routes/delete-transaction.ts`) has `endDate` set and is simply excluded
 * from the query below — never resurrected by a later read.
 */
export async function materializeRecurringOccurrences(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Promise<void> {
  const series = await prisma.recurringSeries.findMany({
    where: {
      userId,
      startDate: { lt: rangeEnd },
      OR: [{ endDate: null }, { endDate: { gt: rangeStart } }],
    },
    include: { creditCard: { select: { closingDay: true, dueDay: true } } },
  });

  const due = series.flatMap((s) => {
    const date = occurrenceInRange(
      s.startDate,
      s.frequency,
      rangeStart,
      rangeEnd,
    );
    if (!date || (s.endDate && date >= s.endDate)) return [];
    return [{ series: s, date }];
  });
  if (due.length === 0) return;

  const existing = await prisma.transaction.findMany({
    where: {
      recurringSeriesId: { in: due.map(({ series }) => series.id) },
      date: { gte: rangeStart, lt: rangeEnd },
    },
    select: { recurringSeriesId: true, date: true },
  });
  const key = (seriesId: string, date: Date) =>
    `${seriesId}:${date.toISOString()}`;
  const existingKeys = new Set(
    existing.map((row) => key(row.recurringSeriesId ?? "", row.date)),
  );
  const missing = due.filter(
    ({ series, date }) => !existingKeys.has(key(series.id, date)),
  );
  if (missing.length === 0) return;

  await prisma.$transaction(async (tx) => {
    const onCard = missing.filter(({ series }) => series.creditCard);
    for (const [creditCardId, entries] of Map.groupBy(
      onCard,
      ({ series }) => series.creditCardId ?? "",
    )) {
      const card = entries[0]?.series.creditCard;
      if (!card) continue;
      await ensureBills(
        tx,
        creditCardId,
        card.closingDay,
        card.dueDay,
        entries.map(({ date }) => date),
      );
    }

    await tx.transaction.createMany({
      data: missing.map(({ series, date }) => ({
        userId,
        type: "EXPENSE" as const,
        category: series.category,
        description: series.description,
        amount: series.amount,
        date,
        timing: "RECURRING" as const,
        paymentMethod: series.paymentMethod,
        creditCardId: series.creditCardId,
        recurringSeriesId: series.id,
      })),
      skipDuplicates: true,
    });
  });
}
