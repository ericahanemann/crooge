import { z } from "zod";

export const categoryKindSchema = z.enum(["expense", "income"]);

export const KIND_TO_DB = {
  expense: "EXPENSE",
  income: "INCOME",
} as const;

export const KIND_TO_API = {
  EXPENSE: "expense",
  INCOME: "income",
} as const;

/**
 * Curated icon set a category's `icon` must be one of. Kept in sync by hand
 * with the frontend's `CATEGORY_ICON_KEYS` (`frontend/src/lib/category-icons.ts`)
 * — the backend only validates the key, it never renders anything.
 */
export const iconKeySchema = z.enum([
  "utensils",
  "shopping-cart",
  "car",
  "navigation",
  "monitor-play",
  "music",
  "heart-pulse",
  "shopping-bag",
  "zap",
  "home",
  "gamepad-2",
  "coffee",
  "tag",
  "banknote",
  "briefcase",
  "gift",
  "trending-up",
  "plane",
  "bus",
  "fuel",
  "wifi",
  "phone",
  "dumbbell",
  "paw-print",
  "book",
  "wrench",
  "piggy-bank",
  "film",
  "shirt",
  "pill",
  "graduation-cap",
  "umbrella",
]);

/** A per-user category — every category (starter or user-created) is one of these; there's no separate hardcoded built-in list server-side. */
export const categoryResponseSchema = z
  .object({
    id: z.uuid(),
    kind: categoryKindSchema,
    label: z.string(),
    icon: iconKeySchema,
    isFallback: z
      .boolean()
      .describe(
        'True for exactly one category per kind (seeded at signup as "Other") — the reassignment target when another category is deleted. Can\'t itself be deleted.',
      ),
    isSystem: z
      .boolean()
      .describe(
        'True for backend-managed categories (currently just the lazily-created "Credit Card Bill" expense category used by materialized bill transactions — see `credit-cards/materialize-bill-transaction.ts`). Can\'t be deleted, and hidden from the manual category picker in the expense dialogs.',
      ),
  })
  .describe("A category.");

z.globalRegistry.add(categoryResponseSchema, { id: "Category" });

export type IconKey = z.infer<typeof iconKeySchema>;
