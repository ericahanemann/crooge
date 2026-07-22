import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { CardSelector } from "@/components/credit-card/card-selector";
import { ChartCardSkeleton } from "@/components/credit-card/chart-card-skeleton";
import { CreditCardTransactionsList } from "@/components/credit-card/credit-card-transactions-list";
import { StatementChartCard } from "@/components/credit-card/statement-chart-card";
import { toIntlLocale } from "@/lib/format";
import { mockCreditCard } from "@/lib/mock-credit-card";

interface BillsSummaryPageProps {
  searchParams: Promise<{ card?: string; month?: string }>;
}

export default async function BillsSummaryPage({
  searchParams,
}: BillsSummaryPageProps) {
  const { card: rawCard, month: rawMonth } = await searchParams;
  const locale = await getLocale();

  const selectedCard =
    rawCard === mockCreditCard.id ? rawCard : mockCreditCard.id;

  const selectedMonth =
    rawMonth && mockCreditCard.bills.some((b) => b.month === rawMonth)
      ? rawMonth
      : mockCreditCard.currentMonth;

  const [year, mon] = selectedMonth.split("-").map(Number) as [number, number];
  const title = new Date(year, mon - 1, 1)
    .toLocaleString(toIntlLocale(locale), {
      month: "long",
      year: "numeric",
    })
    .toUpperCase();

  const cards = [
    { id: mockCreditCard.id, name: mockCreditCard.name },
    { id: "itau-1", name: "ITAÚ" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={title} />
      <div className="flex-1 overflow-auto p-7 space-y-5">
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
