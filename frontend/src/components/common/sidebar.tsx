import { CalendarDays, CreditCard, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { NavGroup } from "./nav-group";
import { NavLink } from "./nav-link";

export async function AppSidebar() {
  const t = await getTranslations("nav");

  return (
    <aside className="flex flex-col w-56 shrink-0 h-screen border-r border-border bg-card">
      <div className="px-5 py-7">
        <Image
          src="/logo.svg"
          alt="Crooge"
          width={120}
          height={40}
          priority
          className="invert dark:invert-0"
        />
      </div>
      <nav className="flex-1 px-3 space-y-0.5">
        <NavLink
          href="/"
          label={t("dashboard")}
          icon={<LayoutDashboard size={17} strokeWidth={1.5} />}
        />
        <NavLink
          href="/monthly"
          label={t("monthly")}
          icon={<CalendarDays size={17} strokeWidth={1.5} />}
        />
        <NavGroup
          icon={<CreditCard size={17} strokeWidth={1.5} />}
          label={t("creditCards")}
          links={[
            {
              href: "/credit-cards/current-bill",
              label: t("currentStatement"),
            },
            {
              href: "/credit-cards/bills-summary",
              label: t("statementSummary"),
            },
          ]}
        />
      </nav>
    </aside>
  );
}
