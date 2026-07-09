import { useLocale } from "next-intl";
import { PageHeader } from "@/components/page-header";

export default function MonthlyPage() {
  const locale = useLocale();
  const month = new Date()
    .toLocaleString(locale, { month: "long" })
    .toUpperCase();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <PageHeader title={month} />
      <div className="flex-1 overflow-auto p-8" />
    </div>
  );
}
