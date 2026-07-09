"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/monthly", label: "MONTHLY", icon: CalendarDays },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-60 shrink-0 h-screen border-r border-border bg-card">
      <div className="px-6 py-8">
        <Image
          src="/logo.svg"
          alt="Crooge"
          width={130}
          height={44}
          priority
          className="invert dark:invert-0"
        />
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted",
              pathname === href && "bg-muted text-foreground"
            )}
          >
            <Icon size={18} strokeWidth={1.5} />
            <span className="font-karantina text-2xl tracking-wide">{label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
