"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogPrimaryButton,
  DialogSecondaryButton,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import type { Category } from "@/lib/types";
import { CategorySelect } from "./category-select";

interface FormErrors {
  description?: string;
  amount?: string;
  date?: string;
  category?: string;
}

/**
 * "+ ADD INCOME" dialog triggered from `BalanceCard`
 *
 * @state open - dialog visibility; resetting the form runs on close (X, Cancel, or backdrop) via `onOpenChange`
 * @state description/amount/date/category - the form fields. `date` defaults to today (`todayISO()`).
 * @state customCategories - session-local categories added via `CategorySelect`'s "+" button; lost when the dialog fully closes (not persisted)
 * @state keepAdding - "keep adding" checkbox
 * @state errors - per-field validation messages, recomputed on submit by `validate()`.
 * @state justAdded - drives the brief "added" acknowledgment shown after a keep-adding submit; auto-clears after 1.5s
 */
export function AddIncomeDialog() {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [keepAdding, setKeepAdding] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [justAdded, setJustAdded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  useEffect(() => {
    if (!open) return;
    listCategoriesAction("income").then(setCategories);
  }, [open]);

  async function handleAddCategory(
    label: string,
    icon: string,
  ): Promise<Category | null> {
    const result = await createCategoryAction("income", label, icon);
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
    setDescription("");
    setAmount("");
    setDate(todayISO());
    setCategory(null);
    setCategories([]);
    setKeepAdding(false);
    setErrors({});
    setJustAdded(false);
    setSubmitError(null);
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
    if (!description.trim())
      nextErrors.description = t("dialogs.common.errorRequired");
    const parsedAmount = Number(amount);
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = t("dialogs.common.errorPositive");
    }
    if (!date) nextErrors.date = t("dialogs.common.errorRequired");
    if (!category) nextErrors.category = t("dialogs.common.errorRequired");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  /**
   * validates all fields; if invalid, sets `errors` and stops. otherwise
   * submits the transaction to the backend
   *
   * if `keepAdding` is checked, clears only `description`/`amount` and refocuses
   * the description field - `date`/`category`/custom categories persist, since
   * consecutive entries tend to share them. otherwise closes the dialog and resets everything
   */
  async function handleSubmit() {
    if (!validate() || !category) return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await createTransactionAction({
      type: "income",
      description,
      amount: Number(amount),
      date,
      category,
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    router.refresh();

    if (keepAdding) {
      setDescription("");
      setAmount("");
      setErrors({});
      setJustAdded(true);
      descriptionRef.current?.focus();
      return;
    }

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
      <DialogTrigger className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] cursor-pointer">
        {t("monthly.addIncome")}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("dialogs.income.title")}</DialogTitle>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="income-description"
              className="font-sans text-sm text-muted-foreground uppercase"
            >
              {t("dialogs.common.description")}
            </label>
            <Input
              id="income-description"
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.common.descriptionPlaceholder")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="income-amount"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {t("dialogs.common.amount")}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="income-amount"
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
                htmlFor="income-date"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {t("dialogs.common.date")}
              </label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date}</p>
              )}
            </div>
          </div>

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

        {justAdded && (
          <p className="flex items-center gap-1.5 font-sans text-sm text-highlight">
            <Check size={14} />
            {t("dialogs.common.added")}
          </p>
        )}

        {submitError && (
          <p className="text-xs text-destructive">{submitError}</p>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders a native input under the hood */}
          <label className="flex items-center gap-2 font-sans text-sm text-muted-foreground cursor-pointer">
            <Checkbox checked={keepAdding} onCheckedChange={setKeepAdding} />
            {t("dialogs.common.keepAdding")}
          </label>
          <div className="flex gap-3">
            <DialogSecondaryButton
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              {t("dialogs.common.cancel")}
            </DialogSecondaryButton>
            <DialogPrimaryButton onClick={handleSubmit} disabled={submitting}>
              {t("dialogs.common.add")}
            </DialogPrimaryButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
