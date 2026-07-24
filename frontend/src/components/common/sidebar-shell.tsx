"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";
import { SidebarToggle } from "./sidebar-toggle";

export function SidebarShell({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 h-screen border-r border-border bg-card transition-[width] duration-300 ease-in-out",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className={cn("py-7", collapsed ? "flex justify-center" : "px-5")}>
        {collapsed ? (
          <Image
            src="/cow-icon.svg"
            alt="Crooge"
            width={32}
            height={32}
            className="invert dark:invert-0"
          />
        ) : (
          <Image
            src="/logo.svg"
            alt="Crooge"
            width={120}
            height={40}
            priority
            className="invert dark:invert-0"
          />
        )}
      </div>
      <nav className="flex-1 px-3 space-y-0.5">{children}</nav>
      <div
        className={cn(
          "p-3 border-t border-border flex",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <SidebarToggle />
      </div>
    </aside>
  );
}
