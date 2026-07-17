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

interface CardSelectorProps {
  cards: CardOption[];
  selectedCard: string;
  selectedMonth?: string;
}

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
      onValueChange={(value: string) => {
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
