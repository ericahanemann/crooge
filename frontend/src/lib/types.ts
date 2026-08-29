// shared shapes returned by lib/data.ts, sourced from the real backend API.

/** Every category, seeded or user-created, is a real per-user row — see `Category` below. This is just that row's id. */
export type CategoryId = string;
export type TransactionTiming = "oneTime" | "installment" | "recurring";

export interface Transaction {
  id: string;
  date: string;
  category: CategoryId;
  description: string;
  amount: number;
  timing: TransactionTiming;
  installmentCurrent?: number;
  installmentTotal?: number;
}

export type CreditCardBrand = "visa" | "mastercard" | "amex" | "elo";

export interface CreditCardSummary {
  id: string;
  name: string;
  brand: CreditCardBrand;
  limit: number;
  closingDay: number;
  dueDay: number;
  available: number;
  currentMonth: string;
}

export type CreditCardBillStatus = "paid" | "current" | "future";

export interface CreditCardBill {
  month: string;
  amount: number;
  status: CreditCardBillStatus;
  closingDate: string;
  dueDate: string;
}

export interface CreditCardBillsPage {
  items: CreditCardBill[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreditCardDetail extends CreditCardSummary {
  bills: CreditCardBill[];
}

export type CategoryKind = "expense" | "income";

export interface Category {
  id: string;
  kind: CategoryKind;
  label: string;
  icon: string;
  isFallback: boolean;
  isSystem: boolean;
}
