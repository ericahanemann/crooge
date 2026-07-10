import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";

interface SpendingCardProps {
  spent: number;
  income: number;
}

export async function SpendingCard({ spent, income }: SpendingCardProps) {
  const t = await getTranslations("monthly");

  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const daysLeft = Math.max(daysInMonth - today.getDate() + 1, 1);
  const remaining = income - spent;
  const dailyLimit = remaining > 0 ? remaining / daysLeft : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("spentThisMonth")}
        </p>
        <p className="font-sans text-5xl font-bold text-foreground mt-1">
          {fmtCurrency(spent)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("dailyLimit")}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="font-sans text-xl font-semibold text-foreground">
            {fmtCurrency(dailyLimit)}
          </p>
          <span className="font-sans text-sm text-muted-foreground uppercase">
            {t("perDay")}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="mt-auto w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-xl tracking-wide uppercase hover:opacity-90 transition-opacity cursor-pointer"
      >
        {t("addExpense")}
      </button>
    </div>
  );
}
