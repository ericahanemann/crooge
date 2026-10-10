"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  type ResolvedCategoryOption,
  type ResolvedTransactionGroup,
  TransactionRowList,
} from "@/components/common/transaction-row-list";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { TRANSACTIONS_PAGE_SIZE_STEP } from "@/lib/transactions-pagination";

const SEARCH_DEBOUNCE_MS = 300;

interface MonthlyTransactionsFilterProps {
  groups: ResolvedTransactionGroup[];
  categories: ResolvedCategoryOption[];
  /** Total transactions matching the current search/category filter, across every page. */
  total: number;
  /** How many of `total` are already loaded (the size the server was asked for). */
  pageSize: number;
  search?: string;
  category?: string;
  title: string;
  searchPlaceholder: string;
  allCategoriesLabel: string;
  noResultsLabel: string;
  emptyLabel: string;
  loadMoreLabel: string;
}

/**
 * Search box + category select + "load more", all driving the URL
 * (`?q=`/`?category=`/`?pageSize=`) rather than local state — the actual
 * filtering/pagination happens server-side in `transactions-list.tsx`, which
 * re-fetches and re-renders whenever these params change. "Load more" just
 * asks for a bigger first page (bumps `pageSize`) rather than accumulating
 * separately-fetched pages client-side — simplest option given a month's
 * transaction count is inherently small.
 *
 * Changing the search text or category resets `pageSize` back to the
 * default — otherwise a "load more"'d page size would carry into an
 * unrelated filter.
 */
export function MonthlyTransactionsFilter({
  groups,
  categories,
  total,
  pageSize,
  search,
  category,
  title,
  searchPlaceholder,
  allCategoriesLabel,
  noResultsLabel,
  emptyLabel,
  loadMoreLabel,
}: MonthlyTransactionsFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search ?? "");

  const updateParams = useCallback(
    (next: { q?: string; category?: string; pageSize?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, pathname, router],
  );

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  useEffect(() => {
    if (searchInput === (search ?? "")) return;
    const id = setTimeout(() => {
      updateParams({ q: searchInput || undefined, pageSize: undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput, search, updateParams]);

  const loadedCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const hasMore = loadedCount < total;
  const selectedCategory = category ?? "all";
  const selectedLabel =
    selectedCategory === "all"
      ? allCategoriesLabel
      : (categories.find((c) => c.key === selectedCategory)?.label ??
        allCategoriesLabel);
  const isFilterActive = Boolean(search || category);
  const emptyStateLabel = isFilterActive ? noResultsLabel : emptyLabel;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {title}
        </h2>
        <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
          {total}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={selectedCategory}
          onValueChange={(v) =>
            updateParams({
              category: v === "all" ? undefined : (v ?? undefined),
              pageSize: undefined,
            })
          }
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

      <TransactionRowList groups={groups} emptyStateLabel={emptyStateLabel} />

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() =>
              updateParams({ pageSize: pageSize + TRANSACTIONS_PAGE_SIZE_STEP })
            }
            className="px-4 py-1.5 rounded-lg border border-border font-karantina text-xl tracking-wide uppercase text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            {loadMoreLabel}
          </button>
        </div>
      )}
    </div>
  );
}
