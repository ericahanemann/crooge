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
