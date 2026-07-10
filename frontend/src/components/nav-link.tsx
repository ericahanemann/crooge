"use client";

import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import type { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type AppPathname = keyof typeof routing.pathnames;

interface NavLinkProps {
  href: AppPathname;
  label: string;
  icon: ReactNode;
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        pathname === href && "bg-muted text-foreground",
      )}
    >
      {icon}
      <span className="font-karantina text-2xl tracking-wide">{label}</span>
    </Link>
  );
}
