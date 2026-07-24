import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { CardSelector } from "@/components/credit-card/card-selector";
import { ChartCardSkeleton } from "@/components/credit-card/chart-card-skeleton";
import { CreditCardTransactionsList } from "@/components/credit-card/credit-card-transactions-list";
import { StatementChartCard } from "@/components/credit-card/statement-chart-card";
import { mockCreditCard } from "@/lib/mock-credit-card";

interface BillsSummaryPageProps {
  searchParams: Promise<{ card?: string; month?: string }>;
}

export default async function BillsSummaryPage({
  searchParams,
}: BillsSummaryPageProps) {
  const { card: rawCard, month: rawMonth } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("creditCards");

  const selectedCard =
    rawCard === mockCreditCard.id ? rawCard : mockCreditCard.id;

  const selectedMonth =
    rawMonth && mockCreditCard.bills.some((b) => b.month === rawMonth)
      ? rawMonth
      : mockCreditCard.currentMonth;

  const cards = [
    { id: mockCreditCard.id, name: mockCreditCard.name },
    { id: "itau-1", name: "ITAÚ" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("summaryTitle")} />
      <div className="flex-1 overflow-auto p-4 sm:p-7 space-y-5">
        <CardSelector
          cards={cards}
          selectedCard={selectedCard}
          selectedMonth={selectedMonth}
        />
        <Suspense fallback={<ChartCardSkeleton />}>
          <StatementChartCard
            cardId={selectedCard}
            selectedMonth={selectedMonth}
            locale={locale}
          />
        </Suspense>
        <Suspense fallback={<TransactionsSkeleton />}>
          <CreditCardTransactionsList
            cardId={selectedCard}
            month={selectedMonth}
            locale={locale}
          />
        </Suspense>
      </div>
    </div>
  );
}
