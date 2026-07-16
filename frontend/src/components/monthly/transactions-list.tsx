import { getLocale, getTranslations } from "next-intl/server";
import { parseLocalDate } from "@/lib/format";
import type { Transaction } from "@/lib/mock-monthly";
import { mockTransactions } from "@/lib/mock-monthly";
import { TransactionItem } from "./transaction-item";

export async function TransactionsList() {
  const t = await getTranslations("monthly");
  const locale = await getLocale();

  const grouped = mockTransactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      if (!acc[tx.date]) acc[tx.date] = [];
      acc[tx.date]!.push(tx);
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
          {mockTransactions.length}
        </span>
      </div>
      <div className="space-y-5">
        {sortedDates.map((date) => {
          const txs = grouped[date];
          const formattedDate = parseLocalDate(date).toLocaleDateString(
            locale === "pt-BR" ? "pt-BR" : "en-US",
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
    </div>
  );
}
