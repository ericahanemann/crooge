"use client";

import { Menu } from "@base-ui/react/menu";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const localeLabels: Record<string, string> = {
  en: "EN",
  "pt-BR": "PT",
};

/** globe icon dropdown for switching locale (en/pt)
 *
 * navigates to the same page in the new locale via the i18n-aware `router.replace`,
 * which also resolves any localized pathname (e.g. "/monthly" → "/mensal").
 */
export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
  }

  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex size-8 items-center justify-center rounded-lg text-foreground/70 hover:bg-muted hover:text-foreground transition-colors outline-none cursor-pointer">
        <Globe size={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50"
        >
          <Menu.Popup className="min-w-18 bg-card border border-border rounded-md shadow-lg overflow-hidden">
            {routing.locales.map((l) => (
              <Menu.Item
                key={l}
                onClick={() => switchLocale(l)}
                className={cn(
                  "block w-full px-4 py-2.5 text-left font-karantina text-base tracking-wide transition-colors hover:bg-muted cursor-default outline-none",
                  l === locale ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {localeLabels[l]}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
