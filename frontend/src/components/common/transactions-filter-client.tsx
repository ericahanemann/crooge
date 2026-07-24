"use client";

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
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  TrendingUp,
  Utensils,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/mock-monthly";

export type ResolvedTransactionItem = {
  id: number;
  category: Category;
  categoryLabel: string;
  description: string;
  formattedAmount: string;
  isIncome: boolean;
  badge?: {
    label: string;
    highlight: boolean;
  };
};

export type ResolvedTransactionGroup = {
  date: string;
  formattedDate: string;
  items: ResolvedTransactionItem[];
};

export type ResolvedCategoryOption = {
  key: string;
  label: string;
};

interface TransactionsFilterClientProps {
  groups: ResolvedTransactionGroup[];
  categories: ResolvedCategoryOption[];
  title: string;
  searchPlaceholder: string;
  allCategoriesLabel: string;
  noResultsLabel: string;
  emptyLabel: string;
}

const categoryIcons: Record<Category, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingCart,
  transport: Car,
  rideshare: Navigation,
  streaming: MonitorPlay,
  music: Music,
  health: HeartPulse,
  shopping: ShoppingBag,
  utilities: Zap,
  housing: Home,
  entertainment: Gamepad2,
  coffee: Coffee,
  other: Tag,
  salary: Banknote,
  freelance: Briefcase,
  gift: Gift,
  investment: TrendingUp,
};

export function TransactionsFilterClient({
  groups,
  categories,
  title,
  searchPlaceholder,
  allCategoriesLabel,
  noResultsLabel,
  emptyLabel,
}: TransactionsFilterClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          const matchSearch =
            !q ||
            item.categoryLabel.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q);
          const matchCategory =
            selectedCategory === "all" || item.category === selectedCategory;
          return matchSearch && matchCategory;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search, selectedCategory]);

  const totalFiltered = filtered.reduce((sum, g) => sum + g.items.length, 0);
  const selectedLabel =
    selectedCategory === "all"
      ? allCategoriesLabel
      : (categories.find((c) => c.key === selectedCategory)?.label ??
        allCategoriesLabel);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {title}
        </h2>
        <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
          {totalFiltered}
        </span>
      </div>

      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            className="pl-8"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={selectedCategory}
          onValueChange={(v) => setSelectedCategory(v ?? "all")}
        >
          <SelectTrigger className="w-auto min-w-[100px]">
            <span className="font-karantina text-2xl tracking-wide uppercase">
              {selectedLabel}
            </span>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">
              <span className="font-karantina text-2xl tracking-wide uppercase">
                {allCategoriesLabel}
              </span>
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.key} value={cat.key}>
                <span className="font-karantina text-2xl tracking-wide uppercase">
                  {cat.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 ? (
        <div className="py-12 text-center">
          <p className="font-karantina text-2xl tracking-wide uppercase text-muted-foreground">
            {emptyLabel}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-karantina text-2xl tracking-wide uppercase text-muted-foreground">
            {noResultsLabel}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((group) => (
            <div key={group.date}>
              <p className="font-sans text-sm text-muted-foreground uppercase mb-2">
                {group.formattedDate}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <TransactionRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionRow({ item }: { item: ResolvedTransactionItem }) {
  const Icon = categoryIcons[item.category] ?? Tag;
  return (
    <div className="flex items-start gap-3 py-1.5 sm:py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="size-9 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} className="text-highlight" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-karantina text-xl sm:text-2xl tracking-wide text-foreground uppercase truncate">
            {item.categoryLabel}
          </p>
          {item.badge && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-sans text-xs shrink-0",
                item.badge.highlight
                  ? "bg-highlight/10 text-highlight"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {item.badge.label}
            </span>
          )}
        </div>
        <p className="font-sans text-sm text-muted-foreground truncate">
          {item.description}
        </p>
      </div>
      <p
        className={cn(
          "font-sans font-semibold text-sm shrink-0",
          item.isIncome ? "text-highlight" : "text-foreground",
        )}
      >
        {item.formattedAmount}
      </p>
    </div>
  );
}
