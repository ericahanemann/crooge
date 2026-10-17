"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogPrimaryButton,
  DialogSecondaryButton,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import type { Category } from "@/lib/types";
import { parseAmountInput } from "@/lib/utils";
import type {
  ExpenseFormErrors,
  Frequency,
  PaymentMethod,
  Timing,
} from "./expense-form-fields";
import { ExpenseFormFields } from "./expense-form-fields";

/**
 * "+ ADD EXPENSE" dialog triggered from `SpendingCard`
 *
 * @state paymentMethod - debit/pix vs credit.
 * @state timing - which field set renders (one-time / installments /
 *   recurring); see `ExpenseFormFields`.
 * @state frequency - monthly/annual, only relevant (and only rendered) when `timing === "recurring"`.
 * @state installmentCount - only used/validated when `timing === "installments"`; must be an integer ≥ 2.
 * @state customCategories/keepAdding/errors/justAdded - same as `AddIncomeDialog`.
 */
export function AddExpenseDialog() {
  const t = useTranslations();
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.currency ?? "BRL";
  const [open, setOpen] = useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("debit_pix");
  const [timing, setTiming] = useState<Timing>("one_time");
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [keepAdding, setKeepAdding] = useState(false);
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
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

  const parsedAmount = parseAmountInput(amount);
  const parsedInstallments = Number(installmentCount);
  const perInstallment =
    timing === "installments" &&
    parsedAmount > 0 &&
    parsedInstallments >= 1 &&
    Number.isFinite(parsedAmount / parsedInstallments)
      ? parsedAmount / parsedInstallments
      : null;

  function resetForm() {
    setPaymentMethod("debit_pix");
    setTiming("one_time");
    setFrequency("monthly");
    setDescription("");
    setAmount("");
    setInstallmentCount("2");
    setDate(todayISO());
    setCategory(null);
    setCategories([]);
    setKeepAdding(false);
    setErrors({});
    setJustAdded(false);
    setSubmitError(null);
  }

  function validate(): boolean {
    const nextErrors: ExpenseFormErrors = {};
    if (!description.trim())
      nextErrors.description = t("dialogs.common.errorRequired");
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = t("dialogs.common.errorPositive");
    }
    if (
      timing === "installments" &&
      (!Number.isInteger(parsedInstallments) || parsedInstallments < 2)
    ) {
      nextErrors.installments = t("dialogs.expense.errorMinInstallments");
    }
    if (!date) nextErrors.date = t("dialogs.common.errorRequired");
    if (!category) nextErrors.category = t("dialogs.common.errorRequired");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate() || !category) return;

    setSubmitting(true);
    setSubmitError(null);

    const result = await createTransactionAction({
      type: "expense",
      description,
      amount: parsedAmount,
      date,
      category,
      paymentMethod,
      timing,
      installments: timing === "installments" ? parsedInstallments : undefined,
      frequency: timing === "recurring" ? frequency : undefined,
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(
        result.code === "no_credit_card"
          ? t("dialogs.expense.errorNoCard")
          : result.code === "credit_limit_exceeded"
            ? t("dialogs.expense.errorCreditLimitExceeded")
            : t("dialogs.common.errorGeneric"),
      );
      return;
    }

    router.refresh();

    if (keepAdding) {
      setDescription("");
      setAmount("");
      setInstallmentCount("2");
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
      <DialogTrigger className="w-full py-3 rounded-lg bg-muted text-foreground border border-border font-karantina text-2xl tracking-wide uppercase hover:brightness-125 transition-[filter] cursor-pointer">
        {t("monthly.addExpense")}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("dialogs.expense.title")}</DialogTitle>

        <ExpenseFormFields
          idPrefix="expense"
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          timing={timing}
          onTimingChange={setTiming}
          frequency={frequency}
          onFrequencyChange={setFrequency}
          description={description}
          onDescriptionChange={setDescription}
          descriptionRef={descriptionRef}
          amount={amount}
          onAmountChange={setAmount}
          installmentCount={installmentCount}
          onInstallmentCountChange={setInstallmentCount}
          perInstallment={perInstallment}
          currency={currency}
          date={date}
          onDateChange={setDate}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          errors={errors}
        />

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
