import { CalendarDays, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { routing } from "@/i18n/routing";
import { NavLink } from "./nav-link";

type AppPathname = keyof typeof routing.pathnames;

export async function AppSidebar() {
  const t = await getTranslations("nav");

  const navItems: {
    href: AppPathname;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      href: "/",
      label: t("dashboard"),
      icon: <LayoutDashboard size={18} strokeWidth={1.5} />,
    },
    {
      href: "/monthly",
      label: t("monthly"),
      icon: <CalendarDays size={18} strokeWidth={1.5} />,
    },
  ];

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
        {navItems.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} />
        ))}
      </nav>
    </aside>
  );
}
