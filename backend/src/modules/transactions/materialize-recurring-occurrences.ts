import { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { ensureBill } from "../credit-cards/billing-cycle.ts";
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
 * race on separate connections. The actual creation therefore goes through
 * an `upsert` keyed on `Transaction`'s `(recurringSeriesId, date)` unique
 * constraint (mirroring `ensureBill`'s `creditCardId`/`cycleMonth` upsert)
 * rather than trusting the existence check above, which is only a fast-path
 * skip, not the correctness guarantee. Even so, Prisma's `upsert` isn't a
 * single atomic statement — under a tight enough race both sides' internal
 * existence check can miss, and the loser's `INSERT` still raises a P2002
 * unique-violation instead of transparently becoming an update. That's
 * caught below and treated as a no-op: if the row exists now, whoever
 * created it is fine.
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

  for (const s of series) {
    const occurrenceDate = occurrenceInRange(
      s.startDate,
      s.frequency,
      rangeStart,
      rangeEnd,
    );
    if (!occurrenceDate) continue;
    if (s.endDate && occurrenceDate >= s.endDate) continue;

    const existing = await prisma.transaction.findFirst({
      where: { recurringSeriesId: s.id, date: occurrenceDate },
      select: { id: true },
    });
    if (existing) continue;

    try {
      await prisma.$transaction(async (tx) => {
        if (s.creditCardId && s.creditCard) {
          await ensureBill(
            tx,
            s.creditCardId,
            s.creditCard.closingDay,
            s.creditCard.dueDay,
            occurrenceDate,
          );
        }

        await tx.transaction.upsert({
          where: {
            recurringSeriesId_date: {
              recurringSeriesId: s.id,
              date: occurrenceDate,
            },
          },
          update: {},
          create: {
            userId,
            type: "EXPENSE",
            category: s.category,
            description: s.description,
            amount: s.amount,
            date: occurrenceDate,
            timing: "RECURRING",
            paymentMethod: s.paymentMethod,
            creditCardId: s.creditCardId,
            recurringSeriesId: s.id,
          },
        });
      });
    } catch (error) {
      if (
        !(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        )
      ) {
        throw error;
      }
    }
  }
}
