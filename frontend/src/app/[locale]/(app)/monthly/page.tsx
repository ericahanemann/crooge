import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { CreditCardSection } from "@/components/monthly/credit-card-section";
import { CreditCardSectionSkeleton } from "@/components/monthly/credit-card-section-skeleton";
import { MonthlySummaryCards } from "@/components/monthly/monthly-summary-cards";
import { MonthlySummarySkeleton } from "@/components/monthly/monthly-summary-skeleton";
import { TransactionsList } from "@/components/monthly/transactions-list";

export default async function MonthlyPage() {
  const locale = await getLocale();
  const month = new Date()
    .toLocaleString(locale === "pt-BR" ? "pt-BR" : "en-US", { month: "long" })
    .toUpperCase();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={month} />
      <div className="flex-1 overflow-auto p-7 space-y-5">
        <Suspense fallback={<MonthlySummarySkeleton />}>
          <MonthlySummaryCards />
        </Suspense>
        <Suspense fallback={<CreditCardSectionSkeleton />}>
          <CreditCardSection />
        </Suspense>
        <Suspense fallback={<TransactionsSkeleton />}>
          <TransactionsList />
        </Suspense>
      </div>
    </div>
  );
}
