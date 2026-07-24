"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSidebar } from "./sidebar-context";

export function MobileMenuTrigger() {
  const { openMobile } = useSidebar();
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      onClick={openMobile}
      aria-label={t("openMenu")}
      className="flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
    >
      <Menu size={22} strokeWidth={1.5} />
    </button>
  );
}
