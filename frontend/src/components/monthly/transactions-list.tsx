import { getLocale, getTranslations } from "next-intl/server";
import { TransactionItem } from "@/components/common/transaction-item";
import { getMonthlyTransactions } from "@/lib/data";
import { parseLocalDate, toIntlLocale } from "@/lib/format";
import type { Transaction } from "@/lib/mock-monthly";

export async function TransactionsList() {
  const t = await getTranslations("monthly");
  const locale = await getLocale();
  const transactions = await getMonthlyTransactions();

  const grouped = transactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      if (!acc[tx.date]) acc[tx.date] = [];
      acc[tx.date]?.push(tx);
      return acc;
    },
    {},
  );

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {t("transactions")}
        </h2>
        <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
          {transactions.length}
        </span>
      </div>
      {sortedDates.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground text-center py-8">
          —
        </p>
      ) : (
        <div className="space-y-5">
          {sortedDates.map((date) => {
            const txs = grouped[date];
            const formattedDate = parseLocalDate(date).toLocaleDateString(
              toIntlLocale(locale),
              { weekday: "long", month: "long", day: "numeric" },
            );
            return (
              <div key={date}>
                <p className="font-sans text-sm text-muted-foreground uppercase mb-2">
                  {formattedDate}
                </p>
                <div className="space-y-1">
                  {txs.map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
