import { PageHeader } from "@/components/common/page-header";

// this root "/" page sits above the `[locale]` segment, so proxy.ts's next-intl
// middleware normally redirects any request here to "/en" or "/pt-BR" before it
// renders — the real dashboard route users hit is `[locale]/(app)/page.tsx`
// (translated title, same empty-body todo). this copy exists as a pre-redirect
// fallback/build requirement and isn't i18n'd; keep the two in sync if editing one

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="DASHBOARD" />
      <div className="flex-1 overflow-auto p-4 sm:p-7" />
    </div>
  );
}
