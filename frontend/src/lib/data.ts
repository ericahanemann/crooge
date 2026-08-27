import { BackendError, backendFetchJson } from "./backend-fetch";
import type {
  Category,
  CategoryKind,
  CreditCardBill,
  CreditCardDetail,
  CreditCardSummary,
  Transaction,
} from "./types";

// Data-fetching seam for the whole app: every server component that needs
// account/transaction/card data calls through here instead of calling the
// backend directly. Each function does whatever number of backend calls it
// takes to produce the shape components expect — callers don't need to know
// the backend splits card detail/bills across separate endpoints.

export async function getMonthlySummary(month: string) {
  return backendFetchJson<{ balance: number; income: number; spent: number }>(
    `/transactions/summary?month=${month}`,
  );
}

export async function getMonthlyTransactions(
  month: string,
): Promise<Transaction[]> {
  return backendFetchJson<Transaction[]>(`/transactions?month=${month}`);
}

export async function getCreditCards(): Promise<CreditCardSummary[]> {
  return backendFetchJson<CreditCardSummary[]>("/credit-cards");
}

/**
 * A card only has a persisted `CreditCardBill` row for cycles a transaction
 * or an early payment has already touched — a brand-new card has none yet.
 * `/credit-cards/:id`'s `currentBill` is always synthesized on the fly even
 * then, so if `/bills` came back without one, splice that synthesized bill
 * in (sorted by month, matching `/bills`' own ordering) rather than leaving
 * every `bills.find((b) => b.status === "current")` caller with nothing.
 */
function withCurrentBill(
  bills: CreditCardBill[],
  currentBill: CreditCardBill,
): CreditCardBill[] {
  if (bills.some((b) => b.status === "current")) return bills;
  const insertAt = bills.findIndex((b) => b.month > currentBill.month);
  const index = insertAt === -1 ? bills.length : insertAt;
  return [...bills.slice(0, index), currentBill, ...bills.slice(index)];
}

/** Without `id`, uses the user's first card (the app only ever shows one card's worth of UI at a time, and there's no "add a card" flow yet). Returns `null` if the user has no cards, or the given `id` doesn't belong to them. */
export async function getCreditCard(
  id?: string,
): Promise<CreditCardDetail | null> {
  let cardId = id;
  if (!cardId) {
    const [firstCard] = await getCreditCards();
    if (!firstCard) return null;
    cardId = firstCard.id;
  }

  try {
    const [detail, bills] = await Promise.all([
      backendFetchJson<CreditCardSummary & { currentBill: CreditCardBill }>(
        `/credit-cards/${cardId}`,
      ),
      backendFetchJson<CreditCardBill[]>(`/credit-cards/${cardId}/bills`),
    ]);
    const { currentBill, ...summary } = detail;

    return { ...summary, bills: withCurrentBill(bills, currentBill) };
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null;
    throw error;
  }
}

export async function getCreditCardTransactions(
  cardId: string,
  month: string,
): Promise<Transaction[]> {
  return backendFetchJson<Transaction[]>(
    `/credit-cards/${cardId}/transactions?month=${month}`,
  );
}

export async function getCategories(kind?: CategoryKind): Promise<Category[]> {
  return backendFetchJson<Category[]>(
    `/categories${kind ? `?kind=${kind}` : ""}`,
  );
}
