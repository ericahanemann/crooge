import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { MonthNav } from "@/components/monthly/month-nav";
import { CreditCardSection } from "@/components/monthly/credit-card-section";
import { CreditCardSectionSkeleton } from "@/components/monthly/credit-card-section-skeleton";
import { MonthlySummaryCards } from "@/components/monthly/monthly-summary-cards";
import { MonthlySummarySkeleton } from "@/components/monthly/monthly-summary-skeleton";
import { TransactionsList } from "@/components/monthly/transactions-list";

interface MonthlyPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function MonthlyPage({ searchParams }: MonthlyPageProps) {
  const { month: monthParam } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("monthly");

  const isValidMonth =
    monthParam !== undefined && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(monthParam);
  const targetDate = isValidMonth
    ? new Date(`${monthParam}-01T12:00:00`)
    : new Date();
  const currentMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("title")} />
      <div className="flex-1 overflow-auto p-4 sm:p-7 space-y-5">
        <MonthNav currentMonth={currentMonth} locale={locale} />
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
