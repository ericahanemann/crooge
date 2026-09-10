"use server";

import { backendFetch } from "./backend-fetch";

type ActionResult = { ok: true } | { ok: false; message: string };

export interface CreateCreditCardInput {
  name: string;
  brand: "visa" | "mastercard" | "amex" | "elo";
  limit: number;
  closingDay: number;
  dueDay: number;
}

export async function createCreditCardAction(
  input: CreateCreditCardInput,
): Promise<ActionResult> {
  const response = await backendFetch("/credit-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.message ?? "request failed" };
  }

  return { ok: true };
}

export async function updateCreditCardAction(
  cardId: string,
  input: CreateCreditCardInput,
): Promise<ActionResult> {
  const response = await backendFetch(`/credit-cards/${cardId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.message ?? "request failed" };
  }

  return { ok: true };
}

type DeleteCreditCardResult =
  | { ok: true }
  | { ok: false; code: "has_balance" | "unknown"; message: string };

/** Archives (soft-deletes) a card — see `DELETE /credit-cards/:id`. */
export async function deleteCreditCardAction(
  cardId: string,
): Promise<DeleteCreditCardResult> {
  const response = await backendFetch(`/credit-cards/${cardId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      ok: false,
      code: response.status === 409 ? "has_balance" : "unknown",
      message: body?.message ?? "request failed",
    };
  }

  return { ok: true };
}

export async function payCreditCardBillAction(
  cardId: string,
  month: string,
  amount?: number,
): Promise<ActionResult> {
  const response = await backendFetch(
    `/credit-cards/${cardId}/bills/${month}/pay`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(amount !== undefined ? { amount } : {}),
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.message ?? "request failed" };
  }

  return { ok: true };
}
