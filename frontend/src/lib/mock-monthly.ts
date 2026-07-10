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
  | "other";

export interface Transaction {
  id: number;
  date: string;
  category: Category;
  description: string;
  amount: number;
}

export interface CreditCardData {
  name: string;
  brand: "visa" | "mastercard" | "amex" | "elo";
  gradientFrom: string;
  gradientTo: string;
  currentBill: number;
  closingDate: string;
  upcomingBills: number;
}

export const mockBalance = 4320.0;
export const mockIncomeThisMonth = 6500.0;
export const mockSpentThisMonth = 2180.0;

export const mockCreditCard: CreditCardData = {
  name: "NUBANK",
  brand: "mastercard",
  gradientFrom: "#7c3aed",
  gradientTo: "#4c1d95",
  currentBill: 1240.5,
  closingDate: "2026-07-15",
  upcomingBills: 890.0,
};

export const mockTransactions: Transaction[] = [
  {
    id: 1,
    date: "2026-07-10",
    category: "food",
    description: "Restaurante Italiano",
    amount: -45.0,
  },
  {
    id: 2,
    date: "2026-07-10",
    category: "coffee",
    description: "Starbucks",
    amount: -18.5,
  },
  {
    id: 3,
    date: "2026-07-09",
    category: "groceries",
    description: "Supermercado Pão de Açúcar",
    amount: -132.0,
  },
  {
    id: 4,
    date: "2026-07-08",
    category: "transport",
    description: "Gasolina",
    amount: -80.0,
  },
  {
    id: 5,
    date: "2026-07-07",
    category: "streaming",
    description: "Netflix",
    amount: -45.9,
  },
  {
    id: 6,
    date: "2026-07-07",
    category: "rideshare",
    description: "Uber",
    amount: -22.0,
  },
  {
    id: 7,
    date: "2026-07-05",
    category: "shopping",
    description: "Amazon",
    amount: -245.0,
  },
  {
    id: 8,
    date: "2026-07-03",
    category: "health",
    description: "Farmácia",
    amount: -89.0,
  },
  {
    id: 9,
    date: "2026-07-01",
    category: "utilities",
    description: "Conta de Luz",
    amount: -150.0,
  },
  {
    id: 10,
    date: "2026-07-01",
    category: "other",
    description: "Salário",
    amount: 6500.0,
  },
];
