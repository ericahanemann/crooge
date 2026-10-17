"use client";

import { Menu } from "@base-ui/react/menu";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useAuth } from "@/components/auth/auth-provider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/auth-api";
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
  const { updateProfile } = useAuth();

  function switchLocale(next: string) {
    router.replace(pathname, { locale: next });
    // Account-scoped sync, best-effort, routed through `useAuth`'s
    // `updateProfile` (not the raw action) so it also updates
    // `AuthContext.user.locale` — otherwise `PreferencesCard`'s locale
    // Select kept showing the old language after switching from here, since
    // its displayed value reads from `AuthContext`, not from this URL/cookie
    // locale. Signed-out visitors (auth pages) just navigate, same as
    // before; `updateProfile` no-ops without a session.
    updateProfile({ locale: next as Locale }).catch(() => {});
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
