"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CardOption {
  id: string;
  name: string;
}

/**
 * @prop selectedMonth - preserved in the url when switching cards so the page stays on the same month
 * @prop className - overrides the trigger's default `w-48` width
 */
interface CardSelectorProps {
  cards: CardOption[];
  selectedCard: string;
  selectedMonth?: string;
  className?: string;
}

/** dropdown for switching between credit cards; selecting one updates the `?card=` (and `?month=`, if provided) search param via `router.push` */
export function CardSelector({
  cards,
  selectedCard,
  selectedMonth,
  className,
}: CardSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const selected = cards.find((c) => c.id === selectedCard);

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
      <SelectTrigger
        className={cn(
          "w-48 font-karantina text-2xl tracking-wide uppercase",
          className,
        )}
      >
        <span className="truncate">{selected?.name}</span>
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
