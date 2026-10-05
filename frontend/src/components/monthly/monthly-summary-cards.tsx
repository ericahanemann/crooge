import { getMonthlySummary, getProfile } from "@/lib/data";
import { BalanceCard } from "./balance-card";
import { SpendingCard } from "./spending-card";

/**
 * fetches the monthly balance/income/spent summary and renders the balance + spending bento tiles
 * side by side
 *
 * pairs with `MonthlySummarySkeleton` as the Monthly page's `<Suspense>` fallback
 * */
export async function MonthlySummaryCards({ month }: { month: string }) {
  const [{ balance, income, spent }, profile] = await Promise.all([
    getMonthlySummary(month),
    getProfile(),
  ]);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <BalanceCard
        balance={balance}
        income={income}
        currency={profile.currency}
      />
      <SpendingCard
        spent={spent}
        income={income}
        savingsRate={profile.savingsRate}
        currency={profile.currency}
      />
    </div>
  );
}
