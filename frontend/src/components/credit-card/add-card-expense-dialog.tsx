"use client";

import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";
import { payCreditCardBillAction } from "@/lib/credit-card-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "expense" | "pay";

interface FormErrors {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
}

/**
 * @prop cardId - the card this expense/payment applies to
 * @prop billMonth - the bill's `month` key to pay in "pay" mode (always the current bill at both call sites)
 * @prop defaultMode - initial `SegmentedControl` value; user can still switch modes after opening
 * @prop compact - auto-width trigger (used inline in `StatementChartCard`'s header) vs. the default full-width card cta
 * @prop triggerLabel - overrides the default trigger text (both call sites pass `t("addTransaction")`)
 */
interface AddCardExpenseDialogProps {
  cardId: string;
  billMonth: string;
  defaultMode?: Mode;
  compact?: boolean;
  triggerLabel?: string;
}

/**
 * combined "add card expense" / "pay bill" dialog
 *
 * `mode` toggles which fields render: "expense" shows description + category, "pay" only needs amount + date
 */
export function AddCardExpenseDialog({
  cardId,
  billMonth,
  defaultMode = "expense",
  compact = false,
  triggerLabel,
}: AddCardExpenseDialogProps) {
  const t = useTranslations("creditCards");
  const tc = useTranslations("dialogs.common");
  const te = useTranslations("dialogs.expense");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listCategoriesAction("expense").then(setCategories);
  }, [open]);

  async function handleAddCategory(
    label: string,
    icon: string,
  ): Promise<Category | null> {
    const result = await createCategoryAction("expense", label, icon);
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

  function resetForm() {
    setMode(defaultMode);
    setDescription("");
    setAmount("");
    setDate(todayISO());
    setCategory(null);
    setCategories([]);
    setErrors({});
    setSubmitError(null);
  }

  function validate(): boolean {
    const next: FormErrors = {};
    const parsed = Number(amount);
    if (mode === "expense" && !description.trim())
      next.description = tc("errorRequired");
    if (!amount || Number.isNaN(parsed) || parsed <= 0)
      next.amount = tc("errorPositive");
    if (!date) next.date = tc("errorRequired");
    if (mode === "expense" && !category) next.category = tc("errorRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    let result: { ok: true } | { ok: false; code?: string };

    if (mode === "expense") {
      if (!category) return;
      setSubmitting(true);
      setSubmitError(null);
      result = await createTransactionAction({
        type: "expense",
        description,
        category,
        amount: Number(amount),
        date,
        paymentMethod: "credit",
        creditCardId: cardId,
        timing: "one_time",
      });
    } else {
      setSubmitting(true);
      setSubmitError(null);
      result = await payCreditCardBillAction(cardId, billMonth, Number(amount));
    }

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(
        result.code === "credit_limit_exceeded"
          ? te("errorCreditLimitExceeded")
          : tc("errorGeneric"),
      );
      return;
    }

    router.refresh();
    setOpen(false);
    resetForm();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        className={cn(
          "rounded-lg bg-muted text-foreground border border-border font-karantina text-2xl tracking-wide uppercase hover:brightness-125 transition-[filter] cursor-pointer",
          compact ? "px-5 py-2" : "w-full py-3",
        )}
      >
        <span className="flex items-center justify-center gap-2">
          <Plus size={16} strokeWidth={1.5} />
          {triggerLabel ?? t("add")}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {mode === "expense" ? t("dialogExpenseTitle") : tc("amount")}
        </DialogTitle>

        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: "expense", label: t("modeExpense") },
            { value: "pay", label: t("modePay") },
          ]}
        />

        <div className="flex flex-col gap-3.5">
          {mode === "expense" && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="card-description"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {tc("description")}
              </label>
              <Input
                id="card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tc("descriptionPlaceholder")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="card-amount"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {tc("amount")}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="card-amount"
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
                htmlFor="card-date"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {tc("date")}
              </label>
              <Input
                id="card-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
          </div>

          {mode === "expense" && (
            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {tc("category")}
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
          )}
        </div>

        {submitError && (
          <p className="text-xs text-destructive">{submitError}</p>
        )}

        <div className="flex justify-end gap-3">
          <DialogSecondaryButton
            onClick={() => {
              setOpen(false);
              resetForm();
            }}
          >
            {tc("cancel")}
          </DialogSecondaryButton>
          <DialogPrimaryButton onClick={handleSubmit} disabled={submitting}>
            {tc("add")}
          </DialogPrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
