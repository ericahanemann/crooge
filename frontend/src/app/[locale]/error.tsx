"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { StatusPageCard } from "@/components/common/status-page-card";

/**
 * next.js error boundary for the `[locale]` segment — catches render-time errors from
 * any page below it. must be a client component (next.js requirement for `error.tsx`);
 * receives `reset` to retry the failed render without a full navigation
 */
export default function ErrorPage({
  reset,
}: {
  error: globalThis.Error;
  reset: () => void;
}) {
  const t = useTranslations("error");

  return (
    <StatusPageCard
      hero={
        <AlertTriangle
          size={72}
          strokeWidth={1.5}
          className="text-destructive mx-auto"
        />
      }
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] cursor-pointer"
          >
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="w-full py-3 rounded-lg bg-muted text-foreground border border-border font-karantina text-2xl tracking-wide uppercase hover:brightness-125 transition-[filter] flex items-center justify-center"
          >
            {t("goHome")}
          </Link>
        </div>
      }
    />
  );
}
