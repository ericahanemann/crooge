"use client";

import { Pencil, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  type EditableTransaction,
  EditTransactionDialog,
} from "@/components/common/edit-transaction-dialog";
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
 * @prop groups - transactions to render, already grouped by date and
 *   already filtered by whatever search/category filter the caller owns
 *   (`TransactionsFilterClient` filters client-side; the monthly list filters
 *   server-side) — this component has no filtering concerns of its own.
 * @prop emptyStateLabel - shown when `groups` is empty. The caller already
 *   knows whether that's because there's nothing at all or because a filter
 *   matched nothing, and picks the right copy before rendering.
 * @prop fixedCreditCardId - passed through to `EditTransactionDialog` — set
 *   from the credit-card page's transaction list, where every row is
 *   implicitly on this one card and the payment-method toggle should stay
 *   hidden (mirrors `AddCardExpenseDialog`).
 */
interface TransactionRowListProps {
  groups: ResolvedTransactionGroup[];
  emptyStateLabel: string;
  fixedCreditCardId?: string;
}

/**
 * Renders grouped transaction rows plus the shared edit/delete dialog pair —
 * a single `EditTransactionDialog`/`ConfirmDialog` instance driven by
 * `editingId`/`deletingId` rather than one dialog per row. Shared by
 * `TransactionsFilterClient` (credit-card page, client-side filtering) and
 * the monthly page's server-paginated list, so the row markup and dialog
 * wiring only exist once.
 */
export function TransactionRowList({
  groups,
  emptyStateLabel,
  fixedCreditCardId,
}: TransactionRowListProps) {
  const t = useTranslations("dialogs.editTransaction");
  const tc = useTranslations("dialogs.common");
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allItems = groups.flatMap((g) => g.items);
  const editingItem = allItems.find((i) => i.id === editingId) ?? null;
  const deletingItem = allItems.find((i) => i.id === deletingId) ?? null;

  return (
    <>
      {groups.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-karantina text-2xl tracking-wide uppercase text-muted-foreground">
            {emptyStateLabel}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
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
          const result = await deleteTransactionAction(deletingId);
          if (!result.ok) return result;
          router.refresh();
          return { ok: true };
        }}
      />
    </>
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
    <div className="flex items-center gap-3 py-1.5 sm:py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="size-9 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0">
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
          <div className="flex items-center gap-0.5">
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
