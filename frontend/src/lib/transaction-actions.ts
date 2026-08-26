"use server";

import { backendFetch, backendFetchJson } from "./backend-fetch";
import type { CreditCardSummary } from "./types";

export interface CreateTransactionInput {
  type: "income" | "expense";
  description: string;
  amount: number;
  date: string;
  category: string;
  paymentMethod?: "debit_pix" | "credit";
  creditCardId?: string;
  timing?: "one_time" | "installments" | "recurring";
  installments?: number;
  frequency?: "monthly" | "annual";
}

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      code: "no_credit_card" | "credit_limit_exceeded" | "unknown";
      message: string;
    };

/**
 * `input.creditCardId` is only needed if the caller already knows which
 * card to use (e.g. the credit-card pages, which always have one in
 * context). Callers without a card picker (the Monthly page's expense
 * dialog) can omit it when `paymentMethod` is `"credit"` — this resolves
 * to the user's first card server-side, since there's no multi-card UI yet.
 */
export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<ActionResult> {
  let creditCardId = input.creditCardId;

  if (input.paymentMethod === "credit" && !creditCardId) {
    const cards = await backendFetchJson<CreditCardSummary[]>("/credit-cards");
    const [firstCard] = cards;
    if (!firstCard) {
      return { ok: false, code: "no_credit_card", message: "no credit card" };
    }
    creditCardId = firstCard.id;
  }

  const response = await backendFetch("/transactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, creditCardId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      ok: false,
      code: response.status === 422 ? "credit_limit_exceeded" : "unknown",
      message: body?.message ?? "request failed",
    };
  }

  return { ok: true };
}
