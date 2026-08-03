import { getCreditCard, getCreditCards } from "@/lib/data";
import { CardShowcase } from "./card-showcase";

interface CardHeaderSectionProps {
  selectedCardId: string;
  locale: string;
}

/**
 * fetches the selected credit card and renders `CardShowcase`
 *
 * renders nothing if the user has no card yet (no "add a card" flow exists yet)
 */
export async function CardHeaderSection({
  selectedCardId,
  locale,
}: CardHeaderSectionProps) {
  const [card, cards] = await Promise.all([
    getCreditCard(selectedCardId),
    getCreditCards(),
  ]);

  if (!card) return null;

  return (
    <CardShowcase
      card={card}
      cards={cards}
      selectedCard={selectedCardId}
      locale={locale}
      selectedMonth={card.currentMonth}
    />
  );
}
