import { getLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { BalanceCard } from "@/components/monthly/balance-card";
import { CreditCardSection } from "@/components/monthly/credit-card-section";
import { SpendingCard } from "@/components/monthly/spending-card";
import { TransactionsList } from "@/components/monthly/transactions-list";
import {
  mockBalance,
  mockIncomeThisMonth,
  mockSpentThisMonth,
} from "@/lib/mock-monthly";

export default async function MonthlyPage() {
  const locale = await getLocale();
  const month = new Date()
    .toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", { month: "long" })
    .toUpperCase();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={month} />
      <div className="flex-1 overflow-auto p-7 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <BalanceCard balance={mockBalance} income={mockIncomeThisMonth} />
          <SpendingCard
            spent={mockSpentThisMonth}
            income={mockIncomeThisMonth}
          />
        </div>
        <CreditCardSection />
        <TransactionsList />
      </div>
    </div>
  );
}
