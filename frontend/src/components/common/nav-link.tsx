"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

type AppPathname = keyof typeof routing.pathnames;

interface NavLinkProps {
  href: AppPathname;
  label: string;
  icon: ReactNode;
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const active = pathname === href;

  return (
    <div className="relative group/nav-item">
      <Link
        href={href}
        className={cn(
          "flex items-center rounded-md transition-colors",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          active && "bg-muted text-foreground",
          collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        )}
      >
        <span className="shrink-0">{icon}</span>
        <span
          className={cn(
            "font-karantina text-2xl tracking-wide whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200",
            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-xs",
          )}
        >
          {label}
        </span>
      </Link>
      {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1 rounded-md bg-card border border-border shadow-md font-karantina text-xl tracking-wide uppercase whitespace-nowrap opacity-0 pointer-events-none group-hover/nav-item:opacity-100 transition-opacity duration-150">
          {label}
        </div>
      )}
    </div>
  );
}
