"use client";

import { useEffect, useRef, useState } from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const localeLabels: Record<string, string> = {
  en: "EN",
  "pt-BR": "PT",
};

export function LanguageToggle() {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch language"
      >
        <Globe size={16} />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[72px] bg-card border border-border rounded-md shadow-lg overflow-hidden z-50">
          {routing.locales.map((l) => (
            <button
              key={l}
              onClick={() => switchLocale(l)}
              className={cn(
                "block w-full px-4 py-2.5 text-left font-karantina text-sm tracking-wide transition-colors hover:bg-muted",
                l === locale ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
