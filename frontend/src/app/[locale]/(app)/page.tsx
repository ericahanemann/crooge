import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/common/page-header";

export default function DashboardPage() {
const t = useTranslations("dashboard");
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={t("title")} />
      <div className="flex-1 overflow-auto p-7" />
    </div>
  );
}
