import type { Prisma } from "../../generated/prisma/client.ts";

/**
 * Backend-managed fallback: normally seeded at signup (per-locale, via
 * `POST /users`' `categories` payload), but accounts created before that
 * existed may have none. English-only, same known limitation already
 * accepted for `credit-cards/materialize-bill-transaction.ts#ensureCreditCardBillCategory`
 * — this only ever fires as a rare backfill, not the common path.
 */
const FALLBACK_LABEL = "Other";
const FALLBACK_ICON = "tag";

/** Finds the caller's `isFallback` category for `kind`, creating one if none exists yet. Returns its id. */
export async function ensureFallbackCategory(
  client: Prisma.TransactionClient,
  userId: string,
  kind: "EXPENSE" | "INCOME",
): Promise<string> {
  const existing = await client.category.findFirst({
    where: { userId, kind, isFallback: true },
  });
  if (existing) return existing.id;

  const created = await client.category.create({
    data: {
      userId,
      kind,
      label: FALLBACK_LABEL,
      icon: FALLBACK_ICON,
      isFallback: true,
    },
  });
  return created.id;
}
