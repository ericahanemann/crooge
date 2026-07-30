import { Home } from "lucide-react";
import Link from "next/link";
import { StatusPageCard } from "@/components/common/status-page-card";

/**
 * fallback for a 404 with no resolvable locale segment
 *
 * strings are hardcoded english rather than translated — this route sits above
 * `[locale]`, so there's no `NextIntlClientProvider`/locale to translate with. see
 * `[locale]/not-found.tsx` for the in-app 404, which is what users actually hit
 */
export default function RootNotFoundPage() {
  return (
    <StatusPageCard
      heroGap="gap-0"
      hero={
        <span className="font-karantina font-bold text-[8rem] leading-[0.8] tracking-normal text-highlight select-none">
          404
        </span>
      }
      title="PAGE NOT FOUND"
      subtitle="The page you're looking for doesn't exist or has been moved."
      actions={
        <Link
          href="/"
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-karantina text-2xl tracking-wide uppercase hover:brightness-110 transition-[filter] flex items-center justify-center gap-2"
        >
          <Home size={18} strokeWidth={1.5} />
          GO TO DASHBOARD
        </Link>
      }
    />
  );
}
