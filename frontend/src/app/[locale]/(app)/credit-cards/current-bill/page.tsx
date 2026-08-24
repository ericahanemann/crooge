import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TransactionsSkeleton } from "@/components/common/transactions-skeleton";
import { AddCreditCardDialog } from "@/components/credit-card/add-credit-card-dialog";
import { CardHeaderSection } from "@/components/credit-card/card-header-section";
import { CardShowcaseSkeleton } from "@/components/credit-card/card-showcase-skeleton";
import { CreditCardTransactionsList } from "@/components/credit-card/credit-card-transactions-list";
import { StatementCardsSection } from "@/components/credit-card/statement-cards-section";
import { StatementCardsSkeleton } from "@/components/credit-card/statement-cards-skeleton";
import { getCreditCards } from "@/lib/data";

interface CurrentBillPageProps {
  searchParams: Promise<{ card?: string }>;
}

/**
 * same RSC streaming pattern as the monthly page: resolves `selectedCard`
 * synchronously, then each of the three sections fetches and streams
 * independently behind its own skeleton
 *
 * renders a "no cards yet" message if the user has no card (no "add a card" flow exists yet)
 */
export default async function CurrentBillPage({
  searchParams,
}: CurrentBillPageProps) {
  const { card: rawCard } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("creditCards");

  const cards = await getCreditCards();
  const matched = cards.find((c) => c.id === rawCard) ?? cards[0];

  if (!matched) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <PageHeader title={t("currentStatement")} />
        <div className="flex-1 overflow-auto p-4 sm:p-7 flex flex-col items-center justify-center gap-5">
          <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
            {t("noCards")}
          </span>
          <AddCreditCardDialog />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("currentStatement")} />
      <div className="flex-1 overflow-auto p-4 sm:p-7 space-y-5">
        <Suspense fallback={<CardShowcaseSkeleton />}>
          <CardHeaderSection selectedCardId={matched.id} locale={locale} />
        </Suspense>
        <Suspense fallback={<StatementCardsSkeleton />}>
          <StatementCardsSection cardId={matched.id} locale={locale} />
        </Suspense>
        <Suspense fallback={<TransactionsSkeleton />}>
          <CreditCardTransactionsList
            cardId={matched.id}
            month={matched.currentMonth}
            locale={locale}
          />
        </Suspense>
      </div>
    </div>
  );
}
