import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/common/page-header";
import { CardShowcase } from "@/components/credit-card/card-showcase";
import { CreditCardTransactionsList } from "@/components/credit-card/credit-card-transactions-list";
import { CurrentStatementCard } from "@/components/credit-card/current-statement-card";
import { NextStatementsCard } from "@/components/credit-card/next-statements-card";
import { mockCreditCard } from "@/lib/mock-credit-card";

interface CurrentBillPageProps {
  searchParams: Promise<{ card?: string }>;
}

export default async function CurrentBillPage({
  searchParams,
}: CurrentBillPageProps) {
  const { card: rawCard } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("creditCards");

  const selectedCard =
    rawCard === mockCreditCard.id ? rawCard : mockCreditCard.id;

  // biome-ignore lint/style/noNonNullAssertion: mock data always has a current bill
  const currentBill = mockCreditCard.bills.find((b) => b.status === "current")!;
  const futureBills = mockCreditCard.bills.filter((b) => b.status === "future");
  const transactions =
    mockCreditCard.transactionsByMonth[mockCreditCard.currentMonth] ?? [];

  const cards = [
    { id: mockCreditCard.id, name: mockCreditCard.name },
    { id: "itau-1", name: "ITAÚ" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("currentStatement")} />
      <div className="flex-1 overflow-auto p-7 space-y-5">
        <CardShowcase
          card={mockCreditCard}
          cards={cards}
          selectedCard={selectedCard}
          locale={locale}
          selectedMonth={mockCreditCard.currentMonth}
        />
        <div className="grid grid-cols-2 gap-5">
          <CurrentStatementCard bill={currentBill} locale={locale} />
          <NextStatementsCard
            available={mockCreditCard.available}
            futureBills={futureBills}
          />
        </div>
        <CreditCardTransactionsList
          transactions={transactions}
          locale={locale}
        />
      </div>
    </div>
  );
}
