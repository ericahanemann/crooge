"use server";

import { backendFetch, backendFetchJson } from "./backend-fetch";
import type { CreditCardSummary, TransactionPaymentMethod } from "./types";

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

export interface UpdateTransactionInput {
  description?: string;
  amount?: number;
  date?: string;
  category?: string;
  paymentMethod?: TransactionPaymentMethod;
  creditCardId?: string;
}

/**
 * `input.paymentMethod === "credit"` with no `input.creditCardId` resolves
 * to the caller's first card server-side — same "no multi-card UI yet"
 * fallback `createTransactionAction` uses, so switching a transaction onto
 * a card from a context with no card picker (the Monthly page) still works.
 */
export async function updateTransactionAction(
  id: string,
  input: UpdateTransactionInput,
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

  const response = await backendFetch(`/transactions/${id}`, {
    method: "PATCH",
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

export async function deleteTransactionAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await backendFetch(`/transactions/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.message ?? "request failed" };
  }

  return { ok: true };
}
