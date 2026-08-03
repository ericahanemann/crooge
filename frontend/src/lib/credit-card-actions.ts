"use server";

import { backendFetch } from "./backend-fetch";

type ActionResult = { ok: true } | { ok: false; message: string };

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
