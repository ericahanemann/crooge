import { DEFAULT_ICON_KEY } from "./category-icons";
import type { Category, CategoryKind } from "./types";

/**
 * The starter category set, seeded as real per-user `Category` rows at
 * signup (see `resolveStarterCategories` + `AuthSignupForm`) — there's no
 * separate hardcoded "built-in" list live in the app anymore. `icon` values
 * must be keys from `CATEGORY_ICON_KEYS` (`lib/category-icons.ts`).
 * `isFallback: true` marks the one row per kind that's the delete-protected
 * reassignment target (see `backend/src/modules/categories/routes/delete-category.ts`).
 */
interface StarterCategory {
  kind: CategoryKind;
  labelKey: string;
  icon: string;
  isFallback?: boolean;
}

const starterCategories: StarterCategory[] = [
  { kind: "expense", labelKey: "categories.expense.food", icon: "utensils" },
  {
    kind: "expense",
    labelKey: "categories.expense.groceries",
    icon: "shopping-cart",
  },
  { kind: "expense", labelKey: "categories.expense.transport", icon: "car" },
  {
    kind: "expense",
    labelKey: "categories.expense.rideshare",
    icon: "navigation",
  },
  {
    kind: "expense",
    labelKey: "categories.expense.streaming",
    icon: "monitor-play",
  },
  { kind: "expense", labelKey: "categories.expense.music", icon: "music" },
  {
    kind: "expense",
    labelKey: "categories.expense.health",
    icon: "heart-pulse",
  },
  {
    kind: "expense",
    labelKey: "categories.expense.shopping",
    icon: "shopping-bag",
  },
  { kind: "expense", labelKey: "categories.expense.utilities", icon: "zap" },
  { kind: "expense", labelKey: "categories.expense.housing", icon: "home" },
  {
    kind: "expense",
    labelKey: "categories.expense.entertainment",
    icon: "gamepad-2",
  },
  { kind: "expense", labelKey: "categories.expense.coffee", icon: "coffee" },
  {
    kind: "expense",
    labelKey: "categories.expense.other",
    icon: "tag",
    isFallback: true,
  },
  { kind: "income", labelKey: "categories.income.salary", icon: "banknote" },
  {
    kind: "income",
    labelKey: "categories.income.freelance",
    icon: "briefcase",
  },
  { kind: "income", labelKey: "categories.income.gift", icon: "gift" },
  {
    kind: "income",
    labelKey: "categories.income.investment",
    icon: "trending-up",
  },
  {
    kind: "income",
    labelKey: "categories.income.other",
    icon: "tag",
    isFallback: true,
  },
];

/** Resolves the starter set into signup-ready seed data, labels translated via `t` for the signup locale. */
export function resolveStarterCategories(t: (key: string) => string): Array<{
  kind: CategoryKind;
  label: string;
  icon: string;
  isFallback?: boolean;
}> {
  return starterCategories.map((c) => ({
    kind: c.kind,
    label: t(c.labelKey),
    icon: c.icon,
    isFallback: c.isFallback,
  }));
}

/**
 * Resolves a transaction's stored `category` id into a display label + icon
 * key, given the caller's fetched categories (any kind — a transaction's
 * category id is a specific row, so kind doesn't matter for the lookup).
 * Falls back to `unknownLabel`/the default icon if the id isn't found —
 * happens only when a category was deleted with no fallback category to
 * reassign to (accounts created before per-account seeding existed have
 * none), so the transaction is left pointing at a since-deleted id.
 */
export function resolveCategory(
  categoryId: string,
  categories: Category[],
  unknownLabel: string,
): { label: string; icon: string } {
  const found = categories.find((c) => c.id === categoryId);
  return found
    ? { label: found.label, icon: found.icon }
    : { label: unknownLabel, icon: DEFAULT_ICON_KEY };
}
