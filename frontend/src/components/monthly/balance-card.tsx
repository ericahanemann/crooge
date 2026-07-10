import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";

interface BalanceCardProps {
  balance: number;
  income: number;
}

export async function BalanceCard({ balance, income }: BalanceCardProps) {
  const t = await getTranslations("monthly");
  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("balance")}
        </p>
        <p className="font-sans text-5xl font-bold text-foreground mt-1">
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
      <button
        type="button"
        className="mt-auto w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-xl tracking-wide uppercase hover:opacity-90 transition-opacity cursor-pointer"
      >
        {t("addIncome")}
      </button>
    </div>
  );
}
