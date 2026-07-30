import { Home } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusPageCard } from "@/components/common/status-page-card";

/** in-app 404 — shown for any unmatched route under a resolved locale, fully translated unlike the root `not-found.tsx` fallback */
export default async function NotFoundPage() {
  const locale = await getLocale();
  const t = await getTranslations("notFound");

  return (
    <StatusPageCard
      heroGap="gap-0"
      hero={
        <span className="font-karantina font-bold text-[8rem] leading-[0.8] tracking-normal text-highlight select-none">
          404
        </span>
      }
      title={t("title")}
      subtitle={t("subtitle")}
      actions={
        <Link
          href={`/${locale}`}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] flex items-center justify-center gap-2"
        >
          <Home size={18} strokeWidth={1.5} />
          {t("cta")}
        </Link>
      }
    />
  );
}
