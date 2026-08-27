"use server";

import { backendFetch } from "./backend-fetch";
import type { Category, CategoryKind } from "./types";

type CategoryActionResult =
  | { ok: true; category: Category }
  | { ok: false; code: "duplicate" | "unknown"; message: string };

export async function createCategoryAction(
  kind: CategoryKind,
  label: string,
  icon: string,
): Promise<CategoryActionResult> {
  const response = await backendFetch("/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, label, icon }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      ok: false,
      code: response.status === 409 ? "duplicate" : "unknown",
      message: body?.message ?? "request failed",
    };
  }

  return { ok: true, category: await response.json() };
}

export async function updateCategoryAction(
  id: string,
  label: string,
  icon: string,
): Promise<CategoryActionResult> {
  const response = await backendFetch(`/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label, icon }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return {
      ok: false,
      code: response.status === 409 ? "duplicate" : "unknown",
      message: body?.message ?? "request failed",
    };
  }

  return { ok: true, category: await response.json() };
}

export async function deleteCategoryAction(
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const response = await backendFetch(`/categories/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    return { ok: false, message: body?.message ?? "request failed" };
  }

  return { ok: true };
}

/**
 * A read, but exposed as a server action (not a `lib/data.ts` fetch) so it's
 * directly callable from the client-side dialog components that own the
 * category picker's local state.
 */
export async function listCategoriesAction(
  kind: CategoryKind,
): Promise<Category[]> {
  const response = await backendFetch(`/categories?kind=${kind}`);
  if (!response.ok) return [];
  return response.json();
}
