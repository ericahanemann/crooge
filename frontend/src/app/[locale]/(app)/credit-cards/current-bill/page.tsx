import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { CardHeaderSection } from "@/components/credit-card/card-header-section";
import { CardShowcaseSkeleton } from "@/components/credit-card/card-showcase-skeleton";
import { CreditCardTransactionsList } from "@/components/credit-card/credit-card-transactions-list";
import { StatementCardsSection } from "@/components/credit-card/statement-cards-section";
import { StatementCardsSkeleton } from "@/components/credit-card/statement-cards-skeleton";
import { mockCreditCard } from "@/lib/mock-credit-card";

interface CurrentBillPageProps {
  searchParams: Promise<{ card?: string }>;
}

/**
 * same RSC streaming pattern as the monthly page: resolves `selectedCard`
 * synchronously, then each of the three sections fetches and streams
 * independently behind its own skeleton
 */
export default async function CurrentBillPage({
  searchParams,
}: CurrentBillPageProps) {
  const { card: rawCard } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("creditCards");

  const selectedCard =
    rawCard === mockCreditCard.id ? rawCard : mockCreditCard.id;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("currentStatement")} />
      <div className="flex-1 overflow-auto p-4 sm:p-7 space-y-5">
        <Suspense fallback={<CardShowcaseSkeleton />}>
          <CardHeaderSection selectedCardId={selectedCard} locale={locale} />
        </Suspense>
        <Suspense fallback={<StatementCardsSkeleton />}>
          <StatementCardsSection cardId={selectedCard} locale={locale} />
        </Suspense>
        <Suspense fallback={<TransactionsSkeleton />}>
          <CreditCardTransactionsList
            cardId={selectedCard}
            month={mockCreditCard.currentMonth}
            locale={locale}
          />
        </Suspense>
      </div>
    </div>
  );
}
