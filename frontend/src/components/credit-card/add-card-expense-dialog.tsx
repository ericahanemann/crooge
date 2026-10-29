"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MoneyInput } from "@/components/common/money-input";
import {
  type ExpenseFormErrors,
  ExpenseFormFields,
  type Frequency,
  type Timing,
} from "@/components/monthly/expense-form-fields";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  createCategoryAction,
  deleteCategoryAction,
  listCategoriesAction,
  updateCategoryAction,
} from "@/lib/category-actions";
import { payCreditCardBillAction } from "@/lib/credit-card-actions";
<<<<<<< Updated upstream
import { currencySymbol, todayISO } from "@/lib/format";
import { MAX_INSTALLMENTS } from "@/lib/limits";
=======
import { todayISO } from "@/lib/format";
>>>>>>> Stashed changes
import { createTransactionAction } from "@/lib/transaction-actions";
import type { Category } from "@/lib/types";
import { cn, parseAmountInput } from "@/lib/utils";

type Mode = "expense" | "pay";

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
 * `mode` toggles which fields render: "expense" shows the same
 * description/timing/amount/date/category fields as the monthly page's
 * "+ ADD EXPENSE" dialog (via the shared `ExpenseFormFields`) — payment
 * method is fixed to credit (this card) rather than shown as a choice, since
 * there's nothing to pick; "pay" only needs amount + date.
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
  const { user } = useAuth();
  const currency = user?.currency ?? "BRL";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);

  const [timing, setTiming] = useState<Timing>("one_time");
  const [frequency, setFrequency] = useState<Frequency>("monthly");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [keepAdding, setKeepAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    listCategoriesAction("expense").then(setCategories);
  }, [open]);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 1500);
    return () => clearTimeout(timeout);
  }, [justAdded]);

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
    setTiming("one_time");
    setFrequency("monthly");
    setDescription("");
    setAmount("");
    setInstallmentCount("2");
    setDate(todayISO());
    setCategory(null);
    setCategories([]);
    setErrors({});
    setKeepAdding(false);
    setJustAdded(false);
    setSubmitError(null);
  }

  const parsedAmount = parseAmountInput(amount);
  const parsedInstallments = Number(installmentCount);
  const perInstallment =
    mode === "expense" &&
    timing === "installments" &&
    parsedAmount > 0 &&
    parsedInstallments >= 1 &&
    Number.isFinite(parsedAmount / parsedInstallments)
      ? parsedAmount / parsedInstallments
      : null;

  function validate(): boolean {
    const next: ExpenseFormErrors = {};
    if (mode === "expense") {
      if (!description.trim()) next.description = tc("errorRequired");
      if (
        timing === "installments" &&
        (!Number.isInteger(parsedInstallments) || parsedInstallments < 2)
      ) {
        next.installments = te("errorMinInstallments");
      } else if (
        timing === "installments" &&
        parsedInstallments > MAX_INSTALLMENTS
      ) {
        next.installments = te("errorMaxInstallments", {
          max: MAX_INSTALLMENTS,
        });
      }
      if (!category) next.category = tc("errorRequired");
    }
    if (!amount || Number.isNaN(parsedAmount) || parsedAmount <= 0)
      next.amount = tc("errorPositive");
    if (!date) next.date = tc("errorRequired");
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
        amount: parsedAmount,
        date,
        paymentMethod: "credit",
        creditCardId: cardId,
        timing,
        installments:
          timing === "installments" ? parsedInstallments : undefined,
        frequency: timing === "recurring" ? frequency : undefined,
      });
    } else {
      setSubmitting(true);
      setSubmitError(null);
      result = await payCreditCardBillAction(cardId, billMonth, parsedAmount);
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

    if (mode === "expense" && keepAdding) {
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

        {mode === "expense" ? (
          <ExpenseFormFields
            idPrefix="card-expense"
            showPaymentMethod={false}
            paymentMethod="credit"
            onPaymentMethodChange={() => {}}
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
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="card-pay-amount"
                  className="font-sans text-sm text-muted-foreground uppercase"
                >
                  {tc("amount")}
                </label>
                <MoneyInput
                  id="card-pay-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  currency={currency}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="card-pay-date"
                  className="font-sans text-sm text-muted-foreground uppercase"
                >
                  {tc("date")}
                </label>
                <Input
                  id="card-pay-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                {errors.date && (
                  <p className="text-xs text-destructive">{errors.date}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {justAdded && (
          <p className="flex items-center gap-1.5 font-sans text-sm text-highlight">
            <Check size={14} />
            {tc("added")}
          </p>
        )}

        {submitError && (
          <p className="text-xs text-destructive">{submitError}</p>
        )}

        <div className="flex items-center justify-between gap-3">
          {mode === "expense" ? (
            // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders a native input under the hood
            <label className="flex items-center gap-2 font-sans text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={keepAdding} onCheckedChange={setKeepAdding} />
              {tc("keepAdding")}
            </label>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
