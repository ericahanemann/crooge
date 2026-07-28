import type { CreditCardDetail } from "./mock-credit-card";
import { mockCreditCard } from "./mock-credit-card";
import type { Transaction } from "./mock-monthly";
import {
  mockBalance,
  mockIncomeThisMonth,
  mockSpentThisMonth,
  mockTransactions,
} from "./mock-monthly";

// Data-fetching seam for the whole app: every server component that needs
// account/transaction/card data calls through here instead of importing the
// mock files directly. All functions are `async` and return the same shapes
// a real API/DB call would, so swapping the bodies for real fetches later
// (backend integration) shouldn't require touching any calling component.
// `_id`/`_cardId` params are accepted now (multi-account/multi-card future)
// but unused since there's currently only ever one mock card/account.

export async function getMonthlySummary() {
  return {
    balance: mockBalance,
    income: mockIncomeThisMonth,
    spent: mockSpentThisMonth,
  };
}

export async function getMonthlyTransactions(): Promise<Transaction[]> {
  return mockTransactions;
}

export async function getCreditCard(_id?: string): Promise<CreditCardDetail> {
  return mockCreditCard;
}

export async function getCreditCardTransactions(
  _cardId: string,
  month: string,
): Promise<Transaction[]> {
  return mockCreditCard.transactionsByMonth[month] ?? [];
}
