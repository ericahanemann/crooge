"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();
  const t = useTranslations("nav");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? t("expand") : t("collapse")}
      className="flex items-center rounded-md p-2 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {collapsed ? (
        <PanelLeftOpen size={17} strokeWidth={1.5} />
      ) : (
        <PanelLeftClose size={17} strokeWidth={1.5} />
      )}
    </button>
  );
}
