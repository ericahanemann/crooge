import { getCreditCard } from "@/lib/data";
import { CardShowcase } from "./card-showcase";

interface CardHeaderSectionProps {
  selectedCardId: string;
  locale: string;
}

/**
 * fetches the selected credit card and renders `CardShowcase`
 */
export async function CardHeaderSection({
  selectedCardId,
  locale,
}: CardHeaderSectionProps) {
  const card = await getCreditCard(selectedCardId);
  const cards = [
    { id: card.id, name: card.name },
    { id: "itau-1", name: "ITAÚ" },
  ];
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
