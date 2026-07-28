"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface MonthNavProps {
  currentMonth: string; // YYYY-MM
  locale: string;
}

/**
 * prev/next month stepper for the monthly page
 *
 * navigation only updates the `?month=YYYY-MM` search param (via `router.push`) — the page
 * itself re-reads that param server-side to pick which month's data to show and what
 * `PageHeader`'s title says
 *
 * this component doesn't validate `currentMonth`; it trusts the page already did.
 */
export function MonthNav({ currentMonth, locale }: MonthNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("monthly");

  const intlLocale = locale === "pt-BR" ? "pt-BR" : "en-US";
  const date = new Date(`${currentMonth}-01T12:00:00`);
  const label = date
    .toLocaleString(intlLocale, { month: "long", year: "numeric" })
    .toUpperCase();

  function navigate(delta: number) {
    const d = new Date(`${currentMonth}-01T12:00:00`);
    d.setMonth(d.getMonth() + delta);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label={t("prevMonth")}
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <ChevronLeft size={18} strokeWidth={1.5} />
      </button>
      <span className="font-karantina text-2xl tracking-wide uppercase text-foreground">
        {label}
      </span>
      <button
        type="button"
        aria-label={t("nextMonth")}
        onClick={() => navigate(1)}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
      >
        <ChevronRight size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
