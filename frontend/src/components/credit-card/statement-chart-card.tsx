import { getTranslations } from "next-intl/server";
import { toIntlLocale } from "@/lib/format";
import type { CreditCardBill } from "@/lib/mock-credit-card";
import { AddCardExpenseDialog } from "./add-card-expense-dialog";
import { AnteciparDialog } from "./antecipar-dialog";
import { BillsChart } from "./bills-chart";

interface StatementChartCardProps {
  bills: CreditCardBill[];
  selectedBill: CreditCardBill;
  selectedMonth: string;
  locale: string;
}

export async function StatementChartCard({
  bills,
  selectedBill,
  selectedMonth,
  locale,
}: StatementChartCardProps) {
  const t = await getTranslations("creditCards");

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
