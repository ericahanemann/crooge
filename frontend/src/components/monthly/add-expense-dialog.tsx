"use client";

import { Check, CreditCard, Wallet } from "lucide-react";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { CategoryDef } from "@/lib/categories";
import { fmtCurrency, todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import { cn } from "@/lib/utils";
import { CategorySelect } from "./category-select";

type PaymentMethod = "debit_pix" | "credit";
type Timing = "one_time" | "installments" | "recurring";
type Frequency = "monthly" | "annual";

interface FormErrors {
  description?: string;
  amount?: string;
  installments?: string;
  date?: string;
  category?: string;
}

/**
 * "+ ADD EXPENSE" dialog triggered from `SpendingCard`
 *
 * @state paymentMethod - debit/pix vs credit. UI-only right now — doesn't
 *   change validation or the submit stub, since there's no backend yet to
 *   route the expense to a card vs. account balance.
 * @state timing - which field set renders (one-time / installments /
 *   recurring); see the three conditional blocks below.
 * @state frequency - monthly/annual, only relevant (and only rendered) when `timing === "recurring"`.
 * @state installmentCount - only used/validated when `timing === "installments"`; must be an integer ≥ 2.
 * @state customCategories/keepAdding/errors/justAdded - same as `AddIncomeDialog`.
 */
export function AddExpenseDialog() {
  const t = useTranslations();
  const router = useRouter();
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
  const [customCategories, setCustomCategories] = useState<CategoryDef[]>([]);

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

  const parsedAmount = Number(amount);
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
    setCustomCategories([]);
    setKeepAdding(false);
    setErrors({});
    setJustAdded(false);
    setSubmitError(null);
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};
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

  const descriptionField = (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="expense-description"
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.description")}
      </label>
      <Input
        id="expense-description"
        ref={descriptionRef}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t("dialogs.common.descriptionPlaceholder")}
      />
      {errors.description && (
        <p className="text-xs text-destructive">{errors.description}</p>
      )}
    </div>
  );

  const amountField = (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="expense-amount"
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.amount")}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id="expense-amount"
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
  );

  const dateField = (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="expense-date"
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.date")}
      </label>
      <Input
        id="expense-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
    </div>
  );

  const paymentMethods = [
    {
      value: "debit_pix" as const,
      icon: Wallet,
      label: t("dialogs.expense.paymentDebitPix"),
      description: t("dialogs.expense.paymentDebitPixDescription"),
    },
    {
      value: "credit" as const,
      icon: CreditCard,
      label: t("dialogs.expense.paymentCredit"),
      description: t("dialogs.expense.paymentCreditDescription"),
    },
  ];

  const categoryField = (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-sm text-muted-foreground uppercase">
        {t("dialogs.common.category")}
      </span>
      <CategorySelect
        kind="expense"
        value={category}
        onChange={setCategory}
        customCategories={customCategories}
        onAddCustomCategory={(c) => setCustomCategories((prev) => [...prev, c])}
      />
      {errors.category && (
        <p className="text-xs text-destructive">{errors.category}</p>
      )}
    </div>
  );

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

        <div className="flex flex-col gap-3.5">
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
                    "flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
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
                  <span className="font-sans text-xs text-muted-foreground">
                    {method.description}
                  </span>
                </button>
              );
            })}
          </div>

          <SegmentedControl
            value={timing}
            onChange={setTiming}
            options={[
              { value: "one_time", label: t("dialogs.expense.timingOneTime") },
              {
                value: "installments",
                label: t("dialogs.expense.timingInstallments"),
              },
              {
                value: "recurring",
                label: t("dialogs.expense.timingRecurring"),
              },
            ]}
          />

          {timing === "one_time" && (
            <>
              {descriptionField}
              <div className="grid grid-cols-2 gap-3">
                {amountField}
                {dateField}
              </div>
              {categoryField}
            </>
          )}

          {timing === "installments" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="expense-total-amount"
                    className="font-sans text-sm text-muted-foreground uppercase"
                  >
                    {t("dialogs.expense.totalAmount")}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="expense-total-amount"
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
                    htmlFor="expense-installments"
                    className="font-sans text-sm text-muted-foreground uppercase"
                  >
                    {t("dialogs.expense.installments")}
                  </label>
                  <Input
                    id="expense-installments"
                    type="number"
                    min={2}
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)}
                  />
                  {errors.installments && (
                    <p className="text-xs text-destructive">
                      {errors.installments}
                    </p>
                  )}
                </div>
              </div>

              {perInstallment !== null && (
                <p className="-mt-2 font-sans text-sm text-muted-foreground">
                  ≈ {fmtCurrency(perInstallment)}{" "}
                  {t("dialogs.expense.perMonth")}
                </p>
              )}

              {descriptionField}
              <div className="grid grid-cols-2 gap-3">
                {dateField}
                {categoryField}
              </div>
            </>
          )}

          {timing === "recurring" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="expense-frequency"
                  className="font-sans text-sm text-muted-foreground uppercase"
                >
                  {t("dialogs.expense.frequency")}
                </label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as Frequency)}
                >
                  <SelectTrigger id="expense-frequency">
                    <span className="font-karantina text-2xl tracking-wide uppercase">
                      {frequency === "monthly"
                        ? t("dialogs.expense.frequencyMonthly")
                        : t("dialogs.expense.frequencyAnnual")}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">
                      <span className="font-karantina text-2xl tracking-wide uppercase">
                        {t("dialogs.expense.frequencyMonthly")}
                      </span>
                    </SelectItem>
                    <SelectItem value="annual">
                      <span className="font-karantina text-2xl tracking-wide uppercase">
                        {t("dialogs.expense.frequencyAnnual")}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {descriptionField}
              <div className="grid grid-cols-2 gap-3">
                {amountField}
                {dateField}
              </div>
              {categoryField}
            </>
          )}
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
