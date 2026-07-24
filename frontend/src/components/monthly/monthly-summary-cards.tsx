import { getMonthlySummary } from "@/lib/data";
import { BalanceCard } from "./balance-card";
import { SpendingCard } from "./spending-card";

export async function MonthlySummaryCards() {
  const { balance, income, spent } = await getMonthlySummary();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <BalanceCard balance={balance} income={income} />
      <SpendingCard spent={spent} income={income} />
    </div>
  );
}
