"use client";

import { CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { fmtCurrency, toIntlLocale } from "@/lib/format";
import type { CreditCardBill } from "@/lib/mock-credit-card";
import { cn } from "@/lib/utils";

/**
 * @prop futureBills - bills eligible for early payment (status "future"); from `NextStatementsCard` this is all of them, from `StatementChartCard` it's just the selected one
 * @prop compact - auto-width `px-5 py-2` trigger (for inline placement in `StatementChartCard`'s header) instead of the default full-width card cta
 */
interface AnteciparDialogProps {
  futureBills: CreditCardBill[];
  compact?: boolean;
}

/**
 * "antecipar" (pay a future bill early) dialog: pick one or more upcoming bills, confirm/adjust the amount, submit
 *
 * no backend — `handleClose` is shared by both cancel and confirm, so submission has no real effect yet
 *
 * @state selected - set of bill `month` keys the user has checked
 * @state amount - payment amount; auto-fills to the sum of `selected` bills whenever the selection changes, but stays user-editable afterward
 */
export function AnteciparDialog({
  futureBills,
  compact = false,
}: AnteciparDialogProps) {
  const t = useTranslations("creditCards");
  const tc = useTranslations("dialogs.common");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState("");

  const selectedTotal = futureBills
    .filter((b) => selected.has(b.month))
    .reduce((sum, b) => sum + b.amount, 0);

  useEffect(() => {
    if (selectedTotal > 0) {
      setAmount(selectedTotal.toFixed(2));
    }
  }, [selectedTotal]);

  function toggleBill(month: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  }

  function formatMonth(month: string): string {
    const [year, mon] = month.split("-").map(Number) as [number, number];
    return new Date(year, mon - 1, 1).toLocaleString(toIntlLocale(locale), {
      month: "long",
      year: "numeric",
    });
  }

  function handleClose() {
    setOpen(false);
    setSelected(new Set());
    setAmount("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelected(new Set());
          setAmount("");
        }
      }}
    >
      <DialogTrigger
        className={cn(
          "rounded-lg bg-muted text-foreground border border-border font-karantina text-2xl tracking-wide uppercase hover:brightness-125 transition-[filter] cursor-pointer",
          compact ? "px-5 py-2" : "w-full py-3",
        )}
      >
        <span className="flex items-center justify-center gap-2">
          <CalendarClock size={16} strokeWidth={1.5} />
          {t("anticipate")}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t("dialogAnteciparTitle")}</DialogTitle>

        <div className="flex flex-col gap-3">
          <p className="font-sans text-sm text-muted-foreground uppercase">
            {t("selectStatements")}
          </p>
          <div className="flex flex-col gap-2">
            {futureBills.map((bill) => (
              <button
                key={bill.month}
                type="button"
                onClick={() => toggleBill(bill.month)}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 cursor-pointer hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selected.has(bill.month)}
                    onCheckedChange={() => toggleBill(bill.month)}
                  />
                  <span className="font-sans text-sm text-foreground">
                    {formatMonth(bill.month)}
                  </span>
                </div>
                <span className="font-sans text-sm font-semibold text-foreground">
                  {fmtCurrency(bill.amount)}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="antecipar-amount"
              className="font-sans text-sm text-muted-foreground uppercase"
            >
              {tc("amount")}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="antecipar-amount"
                inputMode="decimal"
                className="pl-6"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <DialogSecondaryButton onClick={handleClose}>
            {tc("cancel")}
          </DialogSecondaryButton>
          <DialogPrimaryButton onClick={handleClose}>
            {t("confirm")}
          </DialogPrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
