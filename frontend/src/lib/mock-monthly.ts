export type Category =
  | "food"
  | "groceries"
  | "transport"
  | "rideshare"
  | "streaming"
  | "music"
  | "health"
  | "shopping"
  | "utilities"
  | "housing"
  | "entertainment"
  | "coffee"
  | "other"
  | "salary"
  | "freelance"
  | "gift"
  | "investment";

export type TransactionTiming = "oneTime" | "installment" | "recurring";

export interface Transaction {
  id: number;
  date: string;
  category: Category;
  description: string;
  amount: number;
  timing: TransactionTiming;
  installmentCurrent?: number;
  installmentTotal?: number;
}

export const mockBalance = 4320.0;
export const mockIncomeThisMonth = 6500.0;
export const mockSpentThisMonth = 2180.0;

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    date: "2026-07-10",
    category: "food",
    description: "Restaurante Italiano",
    amount: -45.0,
    timing: "oneTime",
  },
  {
    id: 2,
    date: "2026-07-10",
    category: "coffee",
    description: "Starbucks",
    amount: -18.5,
    timing: "oneTime",
  },
  {
    id: 3,
    date: "2026-07-09",
    category: "groceries",
    description: "Supermercado Pão de Açúcar",
    amount: -132.0,
    timing: "oneTime",
  },
  {
    id: 4,
    date: "2026-07-08",
    category: "transport",
    description: "Gasolina",
    amount: -80.0,
    timing: "oneTime",
  },
  {
    id: 5,
    date: "2026-07-07",
    category: "streaming",
    description: "Netflix",
    amount: -45.9,
    timing: "recurring",
  },
  {
    id: 6,
    date: "2026-07-07",
    category: "rideshare",
    description: "Uber",
    amount: -22.0,
    timing: "oneTime",
  },
  {
    id: 7,
    date: "2026-07-05",
    category: "shopping",
    description: "Amazon",
    amount: -245.0,
    timing: "installment",
    installmentCurrent: 3,
    installmentTotal: 6,
  },
  {
    id: 8,
    date: "2026-07-03",
    category: "health",
    description: "Farmácia",
    amount: -89.0,
    timing: "oneTime",
  },
  {
    id: 9,
    date: "2026-07-01",
    category: "utilities",
    description: "Conta de Luz",
    amount: -150.0,
    timing: "recurring",
  },
  {
    id: 10,
    date: "2026-07-01",
    category: "salary",
    description: "Salário",
    amount: 6500.0,
    timing: "recurring",
  },
];
