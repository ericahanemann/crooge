"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  createCreditCardAction,
  updateCreditCardAction,
} from "@/lib/credit-card-actions";
import type { CreditCardSummary } from "@/lib/types";

type Brand = "visa" | "mastercard" | "amex" | "elo";

interface FormErrors {
  name?: string;
  limit?: string;
  closingDay?: string;
  dueDay?: string;
}

const BRANDS: Brand[] = ["visa", "mastercard", "amex", "elo"];

/**
 * @prop variant - "primary" (default) is the full-width CTA shown below the
 *   "no cards yet" empty state; "icon" is the compact square trigger next to
 *   `CardSelector` in `CardShowcase`, for adding another card once one already
 *   exists. Ignored when `card` is passed — edit mode always renders as the
 *   compact icon trigger (pencil).
 * @prop card - when passed, the dialog edits this card (`PATCH`) instead of
 *   creating a new one: fields prefill from it, title/submit label/trigger
 *   icon switch to their edit variants, and submit calls
 *   `updateCreditCardAction` with `card.id`.
 */
interface AddCreditCardDialogProps {
  variant?: "primary" | "icon";
  card?: CreditCardSummary;
}

/** combined "add" / "edit" credit card dialog — same fields either way, only the submit target and prefill differ */
export function AddCreditCardDialog({
  variant = "primary",
  card,
}: AddCreditCardDialogProps) {
  const isEdit = card != null;
  const t = useTranslations("creditCards");
  const td = useTranslations("dialogs.creditCard");
  const tc = useTranslations("dialogs.common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(card?.name ?? "");
  const [brand, setBrand] = useState<Brand>(card?.brand ?? "visa");
  const [limit, setLimit] = useState(card ? String(card.limit) : "");
  const [closingDay, setClosingDay] = useState(
    card ? String(card.closingDay) : "1",
  );
  const [dueDay, setDueDay] = useState(card ? String(card.dueDay) : "10");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function resetForm() {
    setName(card?.name ?? "");
    setBrand(card?.brand ?? "visa");
    setLimit(card ? String(card.limit) : "");
    setClosingDay(card ? String(card.closingDay) : "1");
    setDueDay(card ? String(card.dueDay) : "10");
    setErrors({});
    setSubmitError(null);
  }

  function validate(): boolean {
    const parsedLimit = Number(limit);
    const parsedClosingDay = Number(closingDay);
    const parsedDueDay = Number(dueDay);

    const next: FormErrors = {};
    if (!name.trim()) next.name = tc("errorRequired");
    if (!limit || Number.isNaN(parsedLimit) || parsedLimit <= 0)
      next.limit = tc("errorPositive");
    if (
      !Number.isInteger(parsedClosingDay) ||
      parsedClosingDay < 1 ||
      parsedClosingDay > 28
    )
      next.closingDay = td("errorDayRange");
    if (
      !Number.isInteger(parsedDueDay) ||
      parsedDueDay < 1 ||
      parsedDueDay > 28
    )
      next.dueDay = td("errorDayRange");

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const input = {
      name,
      brand,
      limit: Number(limit),
      closingDay: Number(closingDay),
      dueDay: Number(dueDay),
    };
    const result = isEdit
      ? await updateCreditCardAction(card.id, input)
      : await createCreditCardAction(input);

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(tc("errorGeneric"));
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
        // Re-seed from the current `card` prop both ways: on close (so a
        // reopened "add" dialog starts blank) and on open (so a reopened
        // "edit" dialog picks up whatever was last saved — `router.refresh()`
        // from a prior save resolves asynchronously, so the `card` prop can
        // still be stale at the moment this fires on close).
        resetForm();
      }}
    >
      {isEdit ? (
        <DialogTrigger
          title={t("editCard")}
          className="flex items-center justify-center size-10 rounded-lg bg-muted text-foreground border border-border hover:brightness-125 transition-[filter] cursor-pointer"
        >
          <Pencil size={18} strokeWidth={1.5} />
        </DialogTrigger>
      ) : variant === "primary" ? (
        <DialogTrigger className="py-3 px-6 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] cursor-pointer">
          {t("addCard")}
        </DialogTrigger>
      ) : (
        <DialogTrigger
          title={t("addCard")}
          className="flex items-center justify-center size-10 rounded-lg bg-muted text-foreground border border-border hover:brightness-125 transition-[filter] cursor-pointer"
        >
          <Plus size={20} strokeWidth={1.5} />
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogTitle>{isEdit ? td("editTitle") : td("title")}</DialogTitle>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="card-name"
              className="font-sans text-sm text-muted-foreground uppercase"
            >
              {td("name")}
            </label>
            <Input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={td("namePlaceholder")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {td("brand")}
              </span>
              <Select value={brand} onValueChange={(v) => setBrand(v as Brand)}>
                <SelectTrigger id="card-brand">
                  <span className="font-karantina text-2xl tracking-wide uppercase">
                    {brand}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {BRANDS.map((b) => (
                    <SelectItem key={b} value={b}>
                      <span className="font-karantina text-2xl tracking-wide uppercase">
                        {b}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="card-limit"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {td("limit")}
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="card-limit"
                  inputMode="decimal"
                  className="pl-6"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {errors.limit && (
                <p className="text-xs text-destructive">{errors.limit}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="card-closing-day"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {td("closingDay")}
              </label>
              <Input
                id="card-closing-day"
                type="number"
                min={1}
                max={28}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
              {errors.closingDay && (
                <p className="text-xs text-destructive">{errors.closingDay}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="card-due-day"
                className="font-sans text-sm text-muted-foreground uppercase"
              >
                {td("dueDay")}
              </label>
              <Input
                id="card-due-day"
                type="number"
                min={1}
                max={28}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
              {errors.dueDay && (
                <p className="text-xs text-destructive">{errors.dueDay}</p>
              )}
            </div>
          </div>
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
            {isEdit ? tc("save") : tc("add")}
          </DialogPrimaryButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
