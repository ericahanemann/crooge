import { CalendarDays, CreditCard, LayoutDashboard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { NavGroup } from "./nav-group";
import { NavLink } from "./nav-link";
import { SidebarShell } from "./sidebar-shell";

export async function AppSidebar() {
  const t = await getTranslations("nav");

  return (
    <SidebarShell>
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
    </SidebarShell>
  );
}
