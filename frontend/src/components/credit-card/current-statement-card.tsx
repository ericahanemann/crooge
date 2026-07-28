import { getTranslations } from "next-intl/server";
import { fmtCurrency, parseLocalDate, toIntlLocale } from "@/lib/format";
import type { CreditCardBill } from "@/lib/mock-credit-card";
import { AddCardExpenseDialog } from "./add-card-expense-dialog";

interface CurrentStatementCardProps {
  bill: CreditCardBill;
  locale: string;
}

/** bento tile showing the current open statement (amount + closing/due dates) plus an "add transaction" cta, used on the current bill page */
export async function CurrentStatementCard({
  bill,
  locale,
}: CurrentStatementCardProps) {
  const t = await getTranslations("creditCards");

  const fmt = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString(toIntlLocale(locale), {
      month: "short",
      day: "numeric",
    });

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("currentStatement")}
        </p>
        <p className="font-sans text-5xl font-bold text-foreground mt-1">
          {fmtCurrency(bill.amount)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("closingDate")}
        </p>
        <p className="font-sans text-base font-semibold text-foreground">
          {fmt(bill.closingDate)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("dueDate")}
        </p>
        <p className="font-sans text-base font-semibold text-foreground">
          {fmt(bill.dueDate)}
        </p>
      </div>
      <div className="mt-auto">
        <AddCardExpenseDialog triggerLabel={t("addTransaction")} />
      </div>
    </div>
  );
}
