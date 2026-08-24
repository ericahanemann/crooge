import type { CreditCard } from "../../generated/prisma/client.ts";
import { getCycleForDate } from "./billing-cycle.ts";

const BRAND_TO_API = {
  VISA: "visa",
  MASTERCARD: "mastercard",
  AMEX: "amex",
  ELO: "elo",
} as const;

export function apiBrand(brand: CreditCard["brand"]) {
  return BRAND_TO_API[brand];
}

/** Matches the frontend's card summary shape (`CardSelector`, `GET /credit-cards`). */
export function serializeCreditCardSummary(
  card: CreditCard,
  available: number,
) {
  const { cycleMonth } = getCycleForDate(
    card.closingDay,
    card.dueDay,
    new Date(),
  );

  return {
    id: card.id,
    name: card.name,
    brand: apiBrand(card.brand),
    limit: Number(card.limit),
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    available,
    currentMonth: cycleMonth,
  };
}
