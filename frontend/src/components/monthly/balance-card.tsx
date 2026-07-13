import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";
import { AddIncomeDialog } from "./add-income-dialog";

interface BalanceCardProps {
  balance: number;
  income: number;
}

export async function BalanceCard({ balance, income }: BalanceCardProps) {
  const t = await getTranslations("monthly");
  return (
    <div className="bg-card border border-highlight/20 rounded-xl p-5 flex flex-col gap-3.5">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("balance")}
        </p>
        <p className="font-sans text-5xl font-bold text-highlight mt-1">
          {fmtCurrency(balance)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("incomeThisMonth")}
        </p>
        <p className="font-sans text-xl font-semibold text-highlight">
          {fmtCurrency(income)}
        </p>
      </div>
      <div className="mt-auto">
        <AddIncomeDialog />
      </div>
    </div>
  );
}
