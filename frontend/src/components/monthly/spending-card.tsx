import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";
import { AddExpenseDialog } from "./add-expense-dialog";

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
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
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
      <div className="mt-auto">
        <AddExpenseDialog />
      </div>
    </div>
  );
}
