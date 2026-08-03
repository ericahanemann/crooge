import { getMonthlySummary } from "@/lib/data";
import { BalanceCard } from "./balance-card";
import { SpendingCard } from "./spending-card";

/**
 * fetches the monthly balance/income/spent summary and renders the balance + spending bento tiles
 * side by side
 *
 * pairs with `MonthlySummarySkeleton` as the Monthly page's `<Suspense>` fallback
 * */
export async function MonthlySummaryCards({ month }: { month: string }) {
  const { balance, income, spent } = await getMonthlySummary(month);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <BalanceCard balance={balance} income={income} />
      <SpendingCard spent={spent} income={income} />
    </div>
  );
}
