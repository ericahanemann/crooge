"use client";

import { CreditCard, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CategorySelect } from "@/components/monthly/category-select";
import {
  Dialog,
  DialogContent,
  DialogPrimaryButton,
  DialogSecondaryButton,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";
import {
  type UpdateTransactionInput,
  updateTransactionAction,
} from "@/lib/transaction-actions";
import type {
  Category,
  TransactionPaymentMethod,
  TransactionTiming,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export interface EditableTransaction {
  id: string;
  description: string;
  /** Unsigned — the row's actual sign is implied by `isIncome`, same convention as the create dialogs. */
  amount: number;
  date: string;
  category: string;
  isIncome: boolean;
  timing: TransactionTiming;
  paymentMethod?: TransactionPaymentMethod;
  /** Only present when paymentMethod is "credit" — the card this row is already on. */
  creditCardId?: string;
}

interface FormErrors {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
}

/**
 * @prop transaction - the row being edited; `null` while closed (avoids
 *   flashing stale fields as the dialog's close animation plays)
 * @prop fixedCreditCardId - when set (the credit-card page's own
 *   transaction list), the payment-method toggle is hidden entirely — every
 *   transaction there is implicitly credit, on this card, same as that
 *   page's own add-expense dialog
 *
 * Fields shown depend on `transaction.timing`: a one-time row (income or
 * expense) gets every field below; an installment/recurring occurrence only
 * gets description/category — see `updateTransactionBodySchema` on the
 * backend for why the rest is locked once a series exists.
 */
interface EditTransactionDialogProps {
  transaction: EditableTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedCreditCardId?: string;
}

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
  fixedCreditCardId,
}: EditTransactionDialogProps) {
  const t = useTranslations();
  const router = useRouter();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<TransactionPaymentMethod>("debit_pix");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSeries = transaction != null && transaction.timing !== "oneTime";
  const isExpense = transaction != null && !transaction.isIncome;

  useEffect(() => {
    if (!open || !transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setDate(transaction.date);
    setCategory(transaction.category);
    setPaymentMethod(transaction.paymentMethod ?? "debit_pix");
    setErrors({});
    setSubmitError(null);
    listCategoriesAction(transaction.isIncome ? "income" : "expense").then(
      setCategories,
    );
  }, [open, transaction]);

  async function handleAddCategory(
    label: string,
    icon: string,
  ): Promise<Category | null> {
    if (!transaction) return null;
    const result = await createCategoryAction(
      transaction.isIncome ? "income" : "expense",
      label,
      icon,
    );
    if (!result.ok) return null;
    setCategories((prev) => [...prev, result.category]);
    return result.category;
  }

  async function handleEditCategory(
    id: string,
    label: string,
    icon: string,
  ): Promise<boolean> {
    const result = await updateCategoryAction(id, label, icon);
    if (!result.ok) return false;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? result.category : c)),
    );
    return true;
  }

  async function handleDeleteCategory(id: string): Promise<void> {
    const result = await deleteCategoryAction(id);
    if (!result.ok) return;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCategory((prev) => (prev === id ? null : prev));
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!description.trim())
      nextErrors.description = t("dialogs.common.errorRequired");
    if (!isSeries) {
      const parsedAmount = Number(amount);
      if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        nextErrors.amount = t("dialogs.common.errorPositive");
      }
      if (!date) nextErrors.date = t("dialogs.common.errorRequired");
    }
    if (!category) nextErrors.category = t("dialogs.common.errorRequired");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!transaction || !validate() || !category) return;

    setSubmitting(true);
    setSubmitError(null);

    const input: UpdateTransactionInput = { description, category };
    if (!isSeries) {
      input.amount = Number(amount);
      input.date = date;
      if (isExpense) {
        input.paymentMethod = paymentMethod;
        if (paymentMethod === "credit") {
          // Preserve whichever card this row is already on when the method
          // isn't changing — otherwise omit it and let
          // `updateTransactionAction` resolve a fresh switch-to-credit onto
          // the caller's first card, same as `AddExpenseDialog`'s create flow.
          input.creditCardId = fixedCreditCardId ?? transaction.creditCardId;
        }
      }
    }

    const result = await updateTransactionAction(transaction.id, input);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(
        result.code === "credit_limit_exceeded"
          ? t("dialogs.expense.errorCreditLimitExceeded")
          : t("dialogs.common.errorGeneric"),
      );
      return;
    }

    router.refresh();
    onOpenChange(false);
  }

  const paymentMethods = [
    {
      value: "debit_pix" as const,
      icon: Wallet,
      label: t("dialogs.expense.paymentDebitPix"),
    },
    {
      value: "credit" as const,
      icon: CreditCard,
      label: t("dialogs.expense.paymentCredit"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("dialogs.editTransaction.title")}</DialogTitle>

        <div className="flex flex-col gap-3.5">
          {isSeries && (
            <p className="font-sans text-xs text-muted-foreground">
              {t("dialogs.editTransaction.seriesNotice")}
            </p>
          )}

          {!isSeries && isExpense && !fixedCreditCardId && (
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const active = paymentMethod === method.value;
                const Icon = method.icon;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-highlight bg-highlight/10"
                        : "border-border hover:border-foreground/30",
                    )}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.5}
                      className={
                        active ? "text-highlight" : "text-muted-foreground"
                      }
                    />
                    <span
                      className={cn(
                        "font-karantina text-2xl tracking-wide uppercase",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-tx-description"
              className="font-sans text-sm text-muted-foreground uppercase"
            >
              {t("dialogs.common.description")}
            </label>
            <Input
              id="edit-tx-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {!isSeries && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-tx-amount"
                  className="font-sans text-sm text-muted-foreground uppercase"
                >
                  {t("dialogs.common.amount")}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="edit-tx-amount"
                    inputMode="decimal"
                    className="pl-6"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-tx-date"
                  className="font-sans text-sm text-muted-foreground uppercase"
                >
                  {t("dialogs.common.date")}
                </label>
                <Input
                  id="edit-tx-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-sm text-muted-foreground uppercase">
              {t("dialogs.common.category")}
            </span>
            <CategorySelect
              value={category}
              onChange={setCategory}
              categories={categories}
              onAdd={handleAddCategory}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category}</p>
            )}
          </div>
        </div>

        {submitError && (
          <p className="text-xs text-destructive">{submitError}</p>
        )}

        <div className="flex justify-end gap-3">
          <DialogSecondaryButton onClick={() => onOpenChange(false)}>
            {t("dialogs.common.cancel")}
          </DialogSecondaryButton>
          <DialogPrimaryButton onClick={handleSubmit} disabled={submitting}>
            {t("dialogs.common.save")}
          </DialogPrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
