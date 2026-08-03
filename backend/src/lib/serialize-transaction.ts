import type { Transaction } from "../generated/prisma/client.ts";

const TIMING_TO_API = {
  ONE_TIME: "oneTime",
  INSTALLMENT: "installment",
  RECURRING: "recurring",
} as const;

/** API responses mirror the frontend's `Transaction` shape (`lib/mock-monthly.ts`): a single signed `amount`, no separate `type` field. */
export function serializeTransaction(row: Transaction) {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    category: row.category,
    description: row.description,
    amount: row.type === "EXPENSE" ? -Number(row.amount) : Number(row.amount),
    timing: TIMING_TO_API[row.timing],
    installmentCurrent: row.installmentCurrent ?? undefined,
    installmentTotal: row.installmentTotal ?? undefined,
  };
}
