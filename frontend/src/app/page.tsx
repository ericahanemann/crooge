import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title="DASHBOARD" />
      <div className="flex-1 overflow-auto p-7" />
    </div>
  );
}
