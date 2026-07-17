"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import type { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { NavSubLink } from "./nav-sub-link";

type AppPathname = keyof typeof routing.pathnames;

interface NavGroupLink {
  href: AppPathname;
  label: string;
}

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  links: NavGroupLink[];
}

export function NavGroup({ icon, label, links }: NavGroupProps) {
  const pathname = usePathname();
  const isActive = links.some((link) => pathname === link.href);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 rounded-md font-karantina text-2xl tracking-wide uppercase transition-colors",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          size={14}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          {links.map((link) => (
            <NavSubLink key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
