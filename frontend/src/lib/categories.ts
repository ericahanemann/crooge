import {
  Banknote,
  Briefcase,
  Car,
  Coffee,
  Gamepad2,
  Gift,
  HeartPulse,
  Home,
  type LucideIcon,
  MonitorPlay,
  Music,
  Navigation,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Zap,
} from "lucide-react";

/**
 * A selectable transaction category (expense or income) as shown in
 * `CategorySelect` and the transactions list. Built-in categories set
 * `labelKey` (resolved via next-intl); custom categories added inline in a
 * dialog set `customLabel` instead, since user-typed text has no i18n key.
 */
export interface CategoryDef {
  key: string;
  icon: LucideIcon;
  labelKey?: string;
  customLabel?: string;
}

export const defaultExpenseCategories: CategoryDef[] = [
  { key: "food", icon: Utensils, labelKey: "categories.expense.food" },
  {
    key: "groceries",
    icon: ShoppingCart,
    labelKey: "categories.expense.groceries",
  },
  {
    key: "transport",
    icon: Car,
    labelKey: "categories.expense.transport",
  },
  {
    key: "rideshare",
    icon: Navigation,
    labelKey: "categories.expense.rideshare",
  },
  {
    key: "streaming",
    icon: MonitorPlay,
    labelKey: "categories.expense.streaming",
  },
  { key: "music", icon: Music, labelKey: "categories.expense.music" },
  {
    key: "health",
    icon: HeartPulse,
    labelKey: "categories.expense.health",
  },
  {
    key: "shopping",
    icon: ShoppingBag,
    labelKey: "categories.expense.shopping",
  },
  {
    key: "utilities",
    icon: Zap,
    labelKey: "categories.expense.utilities",
  },
  { key: "housing", icon: Home, labelKey: "categories.expense.housing" },
  {
    key: "entertainment",
    icon: Gamepad2,
    labelKey: "categories.expense.entertainment",
  },
  { key: "coffee", icon: Coffee, labelKey: "categories.expense.coffee" },
  { key: "other", icon: Tag, labelKey: "categories.expense.other" },
];

export const defaultIncomeCategories: CategoryDef[] = [
  { key: "salary", icon: Banknote, labelKey: "categories.income.salary" },
  {
    key: "freelance",
    icon: Briefcase,
    labelKey: "categories.income.freelance",
  },
  { key: "gift", icon: Gift, labelKey: "categories.income.gift" },
  {
    key: "investment",
    icon: TrendingUp,
    labelKey: "categories.income.investment",
  },
  { key: "other", icon: Tag, labelKey: "categories.income.other" },
];

/** Resolves the display label for a category: translated for built-ins, verbatim for custom ones. */
export function categoryLabel(
  category: CategoryDef,
  t: (key: string) => string,
): string {
  return category.customLabel ?? t(category.labelKey ?? "");
}

/** Turns a user-typed custom category label into a unique `CategoryDef.key` (slug + timestamp, since there's no backend id yet). */
export function slugifyCategoryKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "category"}-${Date.now()}`;
}
