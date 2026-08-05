import { getCreditCard } from "@/lib/data";
import { CurrentStatementCard } from "./current-statement-card";
import { NextStatementsCard } from "./next-statements-card";

interface StatementCardsSectionProps {
  cardId: string;
  locale: string;
}

/**
 * fetches the card and renders `CurrentStatementCard` + `NextStatementsCard` side by side
 *
 * renders nothing if the card has no bill row for the current cycle yet — e.g. a brand-new card with no
 * transactions, since a bill row is only created once a transaction lands in that cycle
 */
export async function StatementCardsSection({
  cardId,
  locale,
}: StatementCardsSectionProps) {
  const card = await getCreditCard(cardId);
  const currentBill = card?.bills.find((b) => b.status === "current");
  const futureBills = card?.bills.filter((b) => b.status === "future") ?? [];

  if (!card || !currentBill) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <CurrentStatementCard
        cardId={cardId}
        bill={currentBill}
        locale={locale}
      />
      <NextStatementsCard
        cardId={cardId}
        available={card.available}
        futureBills={futureBills}
      />
    </div>
  );
}
