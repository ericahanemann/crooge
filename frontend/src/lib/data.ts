import { BackendError, backendFetchJson } from "./backend-fetch";
import type {
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
      backendFetchJson<CreditCardSummary>(`/credit-cards/${cardId}`),
      backendFetchJson<CreditCardBill[]>(`/credit-cards/${cardId}/bills`),
    ]);

    return { ...detail, bills };
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
