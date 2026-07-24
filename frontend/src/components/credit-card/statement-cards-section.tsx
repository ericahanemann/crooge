import { getCreditCard } from "@/lib/data";
import { CurrentStatementCard } from "./current-statement-card";
import { NextStatementsCard } from "./next-statements-card";

interface StatementCardsSectionProps {
  cardId: string;
  locale: string;
}

export async function StatementCardsSection({
  cardId,
  locale,
}: StatementCardsSectionProps) {
  const card = await getCreditCard(cardId);
  const currentBill = card.bills.find((b) => b.status === "current");
  const futureBills = card.bills.filter((b) => b.status === "future");

  if (!currentBill) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <CurrentStatementCard bill={currentBill} locale={locale} />
      <NextStatementsCard
        available={card.available}
        futureBills={futureBills}
      />
    </div>
  );
}
