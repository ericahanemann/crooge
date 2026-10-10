"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ColorTheme, Currency, Locale, Theme } from "@/lib/auth-api";
import { COLOR_THEME_OPTIONS } from "@/lib/color-themes";
import { cn } from "@/lib/utils";

// Untranslated by design, same as `LanguageToggle`'s "EN"/"PT" — a
// language's own name is conventionally shown in itself, not translated.
const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (BR)",
};

// Currency codes aren't language text (same precedent as card brand names
// in `CardVisual` — see DESIGN.md).
const CURRENCY_OPTIONS: { key: Currency; label: string }[] = [
  { key: "BRL", label: "BRL — R$" },
  { key: "USD", label: "USD — $" },
  { key: "EUR", label: "EUR — €" },
];

/**
 * Every field here applies instantly on change (no Save button) — same
 * interaction as the header's `ThemeToggle`/`ColorThemeToggle`/
 * `LanguageToggle`, which this card deliberately duplicates for
 * discoverability (same underlying `updateProfileAction`). `savingsRate`
 * is the one exception — a number input commits on blur, not on every
 * keystroke.
 */
export function PreferencesCard() {
  const t = useTranslations("profile.preferencesCard");
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [savingsRate, setSavingsRate] = useState(
    String(user?.savingsRate ?? 0),
  );
  const [justSaved, setJustSaved] = useState<string | null>(null);

  if (!user) return null;
  // Captured as primitives (not re-read off `user` below) — TS's control-flow
  // narrowing of the null check above doesn't reach into these nested
  // function *declarations* (only arrow expressions defined after the
  // check get that), so `user.X` inside them would otherwise still type as
  // possibly-null. Also doubles as each handler's "did this actually
  // change" baseline (see below).
  const currentLocale = user.locale;
  const currentTheme = user.theme;
  const currentColorTheme = user.colorTheme;
  const currentCurrency = user.currency;
  const currentSavingsRate = user.savingsRate;

  function flashSaved(field: string) {
    setJustSaved(field);
    setTimeout(
      () => setJustSaved((current) => (current === field ? null : current)),
      1500,
    );
  }

  // Each setter below only calls `updateProfile` (and flashes "saved") when
  // the picked value actually differs from the current one — re-picking an
  // already-active option (Select re-opens on the same value, or a
  // SegmentedControl click lands on the option that's already active)
  // shouldn't fire a network request or an acknowledgment that implies
  // something changed. Same guard `commitSavingsRate` already had.

  function applyLocale(next: Locale) {
    if (next === currentLocale) return;
    router.replace(pathname, { locale: next });
    updateProfile({ locale: next })
      .then(() => flashSaved("locale"))
      .catch(() => {});
  }

  function applyTheme(next: Theme) {
    if (next === currentTheme) return;
    document.documentElement.classList.toggle("dark", next === "dark");
    updateProfile({ theme: next })
      .then(() => flashSaved("theme"))
      .catch(() => {});
  }

  function applyColorTheme(next: ColorTheme) {
    if (next === currentColorTheme) return;
    document.documentElement.setAttribute("data-color-theme", next);
    updateProfile({ colorTheme: next })
      .then(() => flashSaved("colorTheme"))
      .catch(() => {});
  }

  function applyCurrency(next: Currency) {
    if (next === currentCurrency) return;
    updateProfile({ currency: next })
      .then(() => flashSaved("currency"))
      .catch(() => {});
  }

  function commitSavingsRate() {
    const parsed = Math.min(
      100,
      Math.max(0, Math.round(Number(savingsRate) || 0)),
    );
    setSavingsRate(String(parsed));
    if (parsed === currentSavingsRate) return;
    updateProfile({ savingsRate: parsed })
      .then(() => flashSaved("savingsRate"))
      .catch(() => {});
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
      <p className="font-karantina text-2xl tracking-wide text-foreground uppercase">
        {t("heading")}
      </p>

      <Field label={t("localeLabel")} saved={justSaved === "locale"}>
        <Select
          value={user.locale}
          onValueChange={(value) => applyLocale(value as Locale)}
        >
          <SelectTrigger>
            <SelectValue>{LOCALE_DISPLAY_NAMES[user.locale]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LOCALE_DISPLAY_NAMES).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("themeLabel")} saved={justSaved === "theme"}>
        <SegmentedControl
          options={[
            { value: "light", label: t("themeLight") },
            { value: "dark", label: t("themeDark") },
          ]}
          value={user.theme}
          onChange={applyTheme}
        />
      </Field>

      <Field label={t("colorThemeLabel")} saved={justSaved === "colorTheme"}>
        <Select
          value={user.colorTheme}
          onValueChange={(value) => applyColorTheme(value as ColorTheme)}
        >
          <SelectTrigger>
            <SelectValue>
              <span
                className="size-3 rounded-full shrink-0"
                style={{
                  backgroundColor: COLOR_THEME_OPTIONS.find(
                    (o) => o.key === user.colorTheme,
                  )?.hex,
                }}
              />
              {
                COLOR_THEME_OPTIONS.find((o) => o.key === user.colorTheme)
                  ?.label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COLOR_THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                <span
                  className="size-3 rounded-full shrink-0"
                  style={{ backgroundColor: opt.hex }}
                />
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t("currencyLabel")} saved={justSaved === "currency"}>
        <Select
          value={user.currency}
          onValueChange={(value) => applyCurrency(value as Currency)}
        >
          <SelectTrigger>
            <SelectValue>
              {CURRENCY_OPTIONS.find((o) => o.key === user.currency)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label={t("savingsRateLabel")}
        hint={t("savingsRateHint")}
        saved={justSaved === "savingsRate"}
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={savingsRate}
            onChange={(e) => setSavingsRate(e.target.value)}
            onBlur={commitSavingsRate}
            className="h-10 w-24 rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm font-sans outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <span className="font-sans text-sm text-muted-foreground">%</span>
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  saved,
  children,
}: {
  label: string;
  hint?: string;
  saved: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-sans text-sm text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 font-sans text-xs text-highlight transition-opacity",
            saved ? "opacity-100" : "opacity-0",
          )}
        >
          <Check size={12} />
        </span>
      </div>
      {children}
      {hint && (
        <p className="font-sans text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
