"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  type ResolvedCategoryOption,
  type ResolvedTransactionGroup,
  TransactionRowList,
} from "./transaction-row-list";

export type {
  ResolvedCategoryOption,
  ResolvedTransactionGroup,
  ResolvedTransactionItem,
} from "./transaction-row-list";

/**
 * @prop groups - transactions pre-grouped by date, already formatted.
 * @prop categories - categories present in `groups`, for the filter `Select` (not the full category list — only ones with at least one transaction).
 * @prop emptyLabel - shown when `groups` itself is empty (no transactions at all).
 * @prop noResultsLabel - shown when `groups` has data but the current search/category filter matches nothing.
 * @prop fixedCreditCardId - passed through to `TransactionRowList`/`EditTransactionDialog` — set
 *   from the credit-card page's transaction list, where every row is
 *   implicitly on this one card and the payment-method toggle should stay
 *   hidden (mirrors `AddCardExpenseDialog`).
 */
interface TransactionsFilterClientProps {
  groups: ResolvedTransactionGroup[];
  categories: ResolvedCategoryOption[];
  title: string;
  searchPlaceholder: string;
  allCategoriesLabel: string;
  noResultsLabel: string;
  emptyLabel: string;
  fixedCreditCardId?: string;
}

/**
 * client-side search + category filter over an already-formatted transaction list
 *
 * shared by the Monthly credit-card-page list and the credit-card page's own
 * transaction list — the monthly account-wide list (`monthly/transactions-list.tsx`)
 * filters/paginates server-side instead (see `monthly-transactions-filter.tsx`), since
 * that list needed real pagination; this one stays client-side since a single billing
 * cycle's transaction count has the same natural ceiling that made the account-wide
 * list's old client-side approach safe in the first place.
 */
export function TransactionsFilterClient({
  groups,
  categories,
  title,
  searchPlaceholder,
  allCategoriesLabel,
  noResultsLabel,
  emptyLabel,
  fixedCreditCardId,
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
  const emptyStateLabel = groups.length === 0 ? emptyLabel : noResultsLabel;

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

      <TransactionRowList
        groups={filtered}
        emptyStateLabel={emptyStateLabel}
        fixedCreditCardId={fixedCreditCardId}
      />
    </div>
  );
}
