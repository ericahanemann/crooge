import { getTranslations } from "next-intl/server";
import { getCreditCard } from "@/lib/data";
import { toIntlLocale } from "@/lib/format";
import { AddCardExpenseDialog } from "./add-card-expense-dialog";
import { AnteciparDialog } from "./antecipar-dialog";
import { BillsChart } from "./bills-chart";

interface StatementChartCardProps {
  cardId: string;
  selectedMonth: string;
  locale: string;
}

/**
 * bills summary page's main tile: month header + action button (varies by the selected bill's status — "add transaction" for the current bill, "antecipar" for a future one, neither for a paid one) + `BillsChart`
 *
 * `selectedMonth` drives both the header label and which action shows; falls back to the current bill if it doesn't match any bill (e.g. a stale/invalid `?month=` param)
 */
export async function StatementChartCard({
  cardId,
  selectedMonth,
  locale,
}: StatementChartCardProps) {
  const t = await getTranslations("creditCards");
  const card = await getCreditCard(cardId);
  const bills = card.bills;
  const selectedBill =
    bills.find((b) => b.month === selectedMonth) ??
    // biome-ignore lint/style/noNonNullAssertion: bills always contains at least one entry
    bills.find((b) => b.status === "current")!;

  const [year, mon] = selectedMonth.split("-").map(Number) as [number, number];
  const formattedMonth = new Date(year, mon - 1, 1)
    .toLocaleString(toIntlLocale(locale), {
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {formattedMonth}
        </h2>
        {selectedBill.status === "current" && (
          <AddCardExpenseDialog
            defaultMode="pay"
            compact
            triggerLabel={t("addTransaction")}
          />
        )}
        {selectedBill.status === "future" && (
          <AnteciparDialog futureBills={[selectedBill]} compact />
        )}
      </div>
      <BillsChart bills={bills} selectedMonth={selectedMonth} locale={locale} />
    </div>
  );
}
