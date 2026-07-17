import type { Transaction } from "./mock-monthly";

export interface CreditCardBill {
  month: string;
  amount: number;
  status: "paid" | "current" | "future";
  closingDate: string;
  dueDate: string;
}

export interface CreditCardDetail {
  id: string;
  name: string;
  brand: "visa" | "mastercard" | "amex" | "elo";
  limit: number;
  available: number;
  currentMonth: string;
  bills: CreditCardBill[];
  transactionsByMonth: Record<string, Transaction[]>;
}

export const mockCreditCard: CreditCardDetail = {
  id: "nubank-1",
  name: "NUBANK",
  brand: "mastercard",
  limit: 5000,
  available: 3759.5,
  currentMonth: "2026-07",
  bills: [
    {
      month: "2026-01",
      amount: 980.0,
      status: "paid",
      closingDate: "2026-01-25",
      dueDate: "2026-02-05",
    },
    {
      month: "2026-02",
      amount: 1120.5,
      status: "paid",
      closingDate: "2026-02-25",
      dueDate: "2026-03-05",
    },
    {
      month: "2026-03",
      amount: 760.0,
      status: "paid",
      closingDate: "2026-03-25",
      dueDate: "2026-04-05",
    },
    {
      month: "2026-04",
      amount: 1450.0,
      status: "paid",
      closingDate: "2026-04-25",
      dueDate: "2026-05-05",
    },
    {
      month: "2026-05",
      amount: 890.75,
      status: "paid",
      closingDate: "2026-05-25",
      dueDate: "2026-06-05",
    },
    {
      month: "2026-06",
      amount: 1340.0,
      status: "paid",
      closingDate: "2026-06-25",
      dueDate: "2026-07-05",
    },
    {
      month: "2026-07",
      amount: 1240.5,
      status: "current",
      closingDate: "2026-07-25",
      dueDate: "2026-08-05",
    },
    {
      month: "2026-08",
      amount: 950.0,
      status: "future",
      closingDate: "2026-08-25",
      dueDate: "2026-09-05",
    },
    {
      month: "2026-09",
      amount: 1100.0,
      status: "future",
      closingDate: "2026-09-25",
      dueDate: "2026-10-05",
    },
    {
      month: "2026-10",
      amount: 870.0,
      status: "future",
      closingDate: "2026-10-25",
      dueDate: "2026-11-05",
    },
    {
      month: "2026-11",
      amount: 1600.0,
      status: "future",
      closingDate: "2026-11-25",
      dueDate: "2026-12-05",
    },
    {
      month: "2026-12",
      amount: 2100.0,
      status: "future",
      closingDate: "2026-12-25",
      dueDate: "2027-01-05",
    },
    {
      month: "2027-01",
      amount: 980.0,
      status: "future",
      closingDate: "2027-01-25",
      dueDate: "2027-02-05",
    },
  ],
  transactionsByMonth: {
    "2026-07": [
      {
        id: 101,
        date: "2026-07-14",
        category: "shopping",
        description: "Zara",
        amount: -189.9,
        timing: "oneTime",
      },
      {
        id: 102,
        date: "2026-07-13",
        category: "food",
        description: "Outback",
        amount: -112.0,
        timing: "oneTime",
      },
      {
        id: 103,
        date: "2026-07-12",
        category: "streaming",
        description: "Spotify",
        amount: -21.9,
        timing: "recurring",
      },
      {
        id: 104,
        date: "2026-07-11",
        category: "streaming",
        description: "Netflix",
        amount: -45.9,
        timing: "recurring",
      },
      {
        id: 105,
        date: "2026-07-10",
        category: "health",
        description: "Gympass",
        amount: -99.9,
        timing: "recurring",
      },
      {
        id: 106,
        date: "2026-07-09",
        category: "coffee",
        description: "Starbucks",
        amount: -34.5,
        timing: "oneTime",
      },
      {
        id: 107,
        date: "2026-07-08",
        category: "shopping",
        description: "Amazon",
        amount: -245.0,
        timing: "installment",
        installmentCurrent: 3,
        installmentTotal: 6,
      },
      {
        id: 108,
        date: "2026-07-07",
        category: "food",
        description: "iFood",
        amount: -68.5,
        timing: "oneTime",
      },
      {
        id: 109,
        date: "2026-07-05",
        category: "entertainment",
        description: "Cinema",
        amount: -80.0,
        timing: "oneTime",
      },
      {
        id: 110,
        date: "2026-07-03",
        category: "transport",
        description: "Taggy pedágio",
        amount: -42.9,
        timing: "recurring",
      },
    ],
    "2026-06": [
      {
        id: 201,
        date: "2026-06-22",
        category: "shopping",
        description: "Renner",
        amount: -320.0,
        timing: "installment",
        installmentCurrent: 1,
        installmentTotal: 3,
      },
      {
        id: 202,
        date: "2026-06-18",
        category: "food",
        description: "Madero",
        amount: -95.0,
        timing: "oneTime",
      },
      {
        id: 203,
        date: "2026-06-15",
        category: "streaming",
        description: "Disney+",
        amount: -38.9,
        timing: "recurring",
      },
      {
        id: 204,
        date: "2026-06-10",
        category: "health",
        description: "Farmácia",
        amount: -67.5,
        timing: "oneTime",
      },
      {
        id: 205,
        date: "2026-06-05",
        category: "transport",
        description: "Combustível",
        amount: -180.0,
        timing: "oneTime",
      },
    ],
    "2026-05": [
      {
        id: 301,
        date: "2026-05-20",
        category: "shopping",
        description: "Magazine Luiza",
        amount: -450.0,
        timing: "installment",
        installmentCurrent: 2,
        installmentTotal: 4,
      },
      {
        id: 302,
        date: "2026-05-12",
        category: "food",
        description: "Restaurante Japonês",
        amount: -87.0,
        timing: "oneTime",
      },
      {
        id: 303,
        date: "2026-05-08",
        category: "entertainment",
        description: "Show",
        amount: -200.0,
        timing: "oneTime",
      },
    ],
  },
};
