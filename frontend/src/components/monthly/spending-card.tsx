import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";
import { AddExpenseDialog } from "./add-expense-dialog";

interface SpendingCardProps {
  spent: number;
  income: number;
  /** Whole percent (0-100) of income set aside before spending — 0 (the default) makes `budget === income`, today's original behavior. */
  savingsRate: number;
  currency: string;
}

/**
 * "cost" half of the monthly page's top bento row — spent this month +
 * daily limit + Add Expense CTA
 *
 * `dailyLimit` = remaining budget (budget − spent) ÷ days left in the
 * *current calendar month* — always today's month, not whatever month the
 * page is viewing via `MonthNav`. floors at 0 once the budget is exhausted
 * rather than going negative. `budget` is income minus the user's savings
 * goal (see `savingsRate`), not necessarily all of income.
 */
export async function SpendingCard({
  spent,
  income,
  savingsRate,
  currency,
}: SpendingCardProps) {
  const t = await getTranslations("monthly");

  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();
  const daysLeft = Math.max(daysInMonth - today.getDate() + 1, 1);
  const budget = income * (1 - savingsRate / 100);
  const remaining = budget - spent;
  const dailyLimit = remaining > 0 ? remaining / daysLeft : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("spentThisMonth")}
        </p>
        <p className="font-sans text-5xl font-bold text-foreground mt-1">
          {fmtCurrency(spent, currency)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("dailyLimit")}
        </p>
        <div className="flex items-baseline gap-1.5">
          <p className="font-sans text-xl font-semibold text-foreground">
            {fmtCurrency(dailyLimit, currency)}
          </p>
          <span className="font-sans text-sm text-muted-foreground uppercase">
            {t("perDay")}
          </span>
        </div>
      </div>
      {savingsRate > 0 && (
        <p className="font-sans text-xs text-muted-foreground">
          {t("savingGoal", { rate: savingsRate })}
        </p>
      )}
      <div className="mt-auto">
        <AddExpenseDialog />
      </div>
    </div>
  );
}
