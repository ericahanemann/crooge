// shared shapes returned by lib/data.ts, sourced from the real backend API.
// `Category` is a plain string (not a closed union): built-in keys are
// defined in lib/categories.ts, but a transaction's category can also be a
// user-typed custom category, which has no fixed key.

export type Category = string;
export type TransactionTiming = "oneTime" | "installment" | "recurring";

export interface Transaction {
  id: string;
  date: string;
  category: Category;
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

export interface CreditCardDetail extends CreditCardSummary {
  bills: CreditCardBill[];
}
