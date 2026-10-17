"use client";

import { CreditCard, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { CategorySelect } from "@/components/monthly/category-select";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { fmtCurrency } from "@/lib/format";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PaymentMethod = "debit_pix" | "credit";
export type Timing = "one_time" | "installments" | "recurring";
export type Frequency = "monthly" | "annual";

export interface ExpenseFormErrors {
  description?: string;
  amount?: string;
  installments?: string;
  date?: string;
  category?: string;
}

interface ExpenseFormFieldsProps {
  /** Prefix for every field's `id` — keeps two instances of this component on the same page (e.g. two `AddCardExpenseDialog`s) from colliding if both ever render at once. */
  idPrefix: string;
  /** Hides the debit/pix-vs-credit picker when the caller already knows the payment method (e.g. always credit on the credit card page) and fixes `paymentMethod` accordingly. */
  showPaymentMethod?: boolean;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (value: PaymentMethod) => void;
  timing: Timing;
  onTimingChange: (value: Timing) => void;
  frequency: Frequency;
  onFrequencyChange: (value: Frequency) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionRef?: RefObject<HTMLInputElement | null>;
  amount: string;
  onAmountChange: (value: string) => void;
  installmentCount: string;
  onInstallmentCountChange: (value: string) => void;
  perInstallment: number | null;
  currency: string;
  date: string;
  onDateChange: (value: string) => void;
  category: string | null;
  onCategoryChange: (id: string) => void;
  categories: Category[];
  onAddCategory: (label: string, icon: string) => Promise<Category | null>;
  onEditCategory: (id: string, label: string, icon: string) => Promise<boolean>;
  onDeleteCategory: (id: string) => Promise<void>;
  errors: ExpenseFormErrors;
}

/**
 * Timing-dependent field set (description/amount/date/category, plus the
 * installments/recurring-only fields) shared by `AddExpenseDialog` (monthly
 * page) and `AddCardExpenseDialog` (credit card page) — pulled out so the
 * two can't drift out of sync the way they did before (the credit card
 * dialog had no timing choice at all; fixing the installments field order
 * here fixes it in both places at once).
 */
export function ExpenseFormFields({
  idPrefix,
  showPaymentMethod = true,
  paymentMethod,
  onPaymentMethodChange,
  timing,
  onTimingChange,
  frequency,
  onFrequencyChange,
  description,
  onDescriptionChange,
  descriptionRef,
  amount,
  onAmountChange,
  installmentCount,
  onInstallmentCountChange,
  perInstallment,
  currency,
  date,
  onDateChange,
  category,
  onCategoryChange,
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  errors,
}: ExpenseFormFieldsProps) {
  const t = useTranslations();

  const descriptionField = (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`${idPrefix}-description`}
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.description")}
      </label>
      <Input
        id={`${idPrefix}-description`}
        ref={descriptionRef}
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
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
        htmlFor={`${idPrefix}-amount`}
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.amount")}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={`${idPrefix}-amount`}
          inputMode="decimal"
          className="pl-6"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
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
        htmlFor={`${idPrefix}-date`}
        className="font-sans text-sm text-muted-foreground uppercase"
      >
        {t("dialogs.common.date")}
      </label>
      <Input
        id={`${idPrefix}-date`}
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
      />
      {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
    </div>
  );

  const categoryField = (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-sm text-muted-foreground uppercase">
        {t("dialogs.common.category")}
      </span>
      <CategorySelect
        value={category}
        onChange={onCategoryChange}
        categories={categories}
        onAdd={onAddCategory}
        onEdit={onEditCategory}
        onDelete={onDeleteCategory}
      />
      {errors.category && (
        <p className="text-xs text-destructive">{errors.category}</p>
      )}
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

  return (
    <div className="flex flex-col gap-3.5">
      {showPaymentMethod && (
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => {
            const active = paymentMethod === method.value;
            const Icon = method.icon;
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => onPaymentMethodChange(method.value)}
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
      )}

      <SegmentedControl
        value={timing}
        onChange={onTimingChange}
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
          {descriptionField}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${idPrefix}-total-amount`}
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {t("dialogs.expense.totalAmount")}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id={`${idPrefix}-total-amount`}
                  inputMode="decimal"
                  className="pl-6"
                  value={amount}
                  onChange={(e) => onAmountChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${idPrefix}-installments`}
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {t("dialogs.expense.installments")}
              </label>
              <Input
                id={`${idPrefix}-installments`}
                type="number"
                min={2}
                value={installmentCount}
                onChange={(e) => onInstallmentCountChange(e.target.value)}
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
              ≈ {fmtCurrency(perInstallment, currency)}{" "}
              {t("dialogs.expense.perMonth")}
            </p>
          )}

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
              htmlFor={`${idPrefix}-frequency`}
              className="font-sans text-sm text-muted-foreground uppercase"
            >
              {t("dialogs.expense.frequency")}
            </label>
            <Select
              value={frequency}
              onValueChange={(v) => onFrequencyChange(v as Frequency)}
            >
              <SelectTrigger id={`${idPrefix}-frequency`}>
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
  );
}
