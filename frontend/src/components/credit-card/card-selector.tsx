"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CardOption {
  id: string;
  name: string;
}

/** @prop selectedMonth - preserved in the url when switching cards so the page stays on the same month */
interface CardSelectorProps {
  cards: CardOption[];
  selectedCard: string;
  selectedMonth?: string;
}

/** dropdown for switching between credit cards; selecting one updates the `?card=` (and `?month=`, if provided) search param via `router.push` */
export function CardSelector({
  cards,
  selectedCard,
  selectedMonth,
}: CardSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={selectedCard}
      onValueChange={(value) => {
        if (!value) return;
        const params = new URLSearchParams({ card: value });
        if (selectedMonth) params.set("month", selectedMonth);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }}
    >
      <SelectTrigger className="w-48 font-karantina text-2xl tracking-wide uppercase">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cards.map((card) => (
          <SelectItem key={card.id} value={card.id}>
            <span className="font-karantina text-2xl tracking-wide uppercase">
              {card.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
