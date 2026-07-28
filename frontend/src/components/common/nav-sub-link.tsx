"use client";

import { Link, usePathname } from "@/i18n/navigation";
import type { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type AppPathname = keyof typeof routing.pathnames;

interface NavSubLinkProps {
  href: AppPathname;
  label: string;
}

/** indented link inside an expanded `NavGroup`. */
export function NavSubLink({ href, label }: NavSubLinkProps) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center pl-9 pr-3 py-1.5 rounded-md font-karantina text-2xl tracking-wide uppercase transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
