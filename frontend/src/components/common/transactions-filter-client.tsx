"use client";

import { Pencil, Search, Tag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  type EditableTransaction,
  EditTransactionDialog,
} from "@/components/common/edit-transaction-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { deleteTransactionAction } from "@/lib/transaction-actions";
import type {
  CategoryId,
  TransactionPaymentMethod,
  TransactionTiming,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// pre-formatted transaction data ready for client-side rendering

export type ResolvedTransactionItem = {
  id: string;
  date: string;
  category: CategoryId;
  categoryLabel: string;
  categoryIcon: string;
  description: string;
  /** Unsigned — sign is implied by `isIncome`, same convention as the create/edit dialogs. */
  amount: number;
  formattedAmount: string;
  isIncome: boolean;
  timing: TransactionTiming;
  paymentMethod?: TransactionPaymentMethod;
  /** Only present when paymentMethod is "credit". */
  creditCardId?: string;
  readOnly: boolean;
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

/**
 * @prop groups - transactions pre-grouped by date, already formatted.
 * @prop categories - categories present in `groups`, for the filter `Select` (not the full category list — only ones with at least one transaction).
 * @prop emptyLabel - shown when `groups` itself is empty (no transactions at all).
 * @prop noResultsLabel - shown when `groups` has data but the current search/category filter matches nothing.
 * @prop fixedCreditCardId - passed through to `EditTransactionDialog` — set
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
 * shared by the Monthly and Credit Card transaction sections. Also owns the
 * edit/delete dialogs — a single `EditTransactionDialog`/`ConfirmDialog`
 * pair shared across every row, driven by `editingId`/`deletingId` rather
 * than one dialog instance per row.
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
  const t = useTranslations("dialogs.editTransaction");
  const tc = useTranslations("dialogs.common");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const editingItem = allItems.find((i) => i.id === editingId) ?? null;
  const deletingItem = allItems.find((i) => i.id === deletingId) ?? null;

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
                  <TransactionRow
                    key={item.id}
                    item={item}
                    onEdit={() => setEditingId(item.id)}
                    onDelete={() => setDeletingId(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EditTransactionDialog
        transaction={
          editingItem &&
          ({
            id: editingItem.id,
            description: editingItem.description,
            amount: editingItem.amount,
            date: editingItem.date,
            category: editingItem.category,
            isIncome: editingItem.isIncome,
            timing: editingItem.timing,
            paymentMethod: editingItem.paymentMethod,
            creditCardId: editingItem.creditCardId,
          } satisfies EditableTransaction)
        }
        open={editingId != null}
        onOpenChange={(next) => {
          if (!next) setEditingId(null);
        }}
        fixedCreditCardId={fixedCreditCardId}
      />

      <ConfirmDialog
        open={deletingId != null}
        onOpenChange={(next) => {
          if (!next) setDeletingId(null);
        }}
        title={t("deleteTitle")}
        description={
          deletingItem?.timing !== "oneTime"
            ? t("deleteSeriesDescription")
            : t("deleteDescription")
        }
        confirmLabel={tc("delete")}
        cancelLabel={tc("cancel")}
        onConfirm={async () => {
          if (!deletingId) return { ok: true };
          return deleteTransactionAction(deletingId);
        }}
      />
    </div>
  );
}

function TransactionRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ResolvedTransactionItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = CATEGORY_ICONS[item.categoryIcon] ?? Tag;
  return (
    <div className="group flex items-start gap-3 py-1.5 sm:py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
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
      <div className="flex items-center gap-2 shrink-0">
        <p
          className={cn(
            "font-sans font-semibold text-sm",
            item.isIncome ? "text-highlight" : "text-foreground",
          )}
        >
          {item.formattedAmount}
        </p>
        {!item.readOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center justify-center size-6 rounded text-muted-foreground hover:text-destructive hover:bg-muted cursor-pointer"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
