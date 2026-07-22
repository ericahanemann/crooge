import type { CreditCardDetail } from "./mock-credit-card";
import { mockCreditCard } from "./mock-credit-card";
import type { Transaction } from "./mock-monthly";
import {
  mockBalance,
  mockIncomeThisMonth,
  mockSpentThisMonth,
  mockTransactions,
} from "./mock-monthly";

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
