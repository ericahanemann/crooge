import { getTranslations } from "next-intl/server";
import { fmtCurrency } from "@/lib/format";
import type { CreditCardBill } from "@/lib/types";
import { AnteciparDialog } from "./antecipar-dialog";

interface NextStatementsCardProps {
  cardId: string;
  available: number;
  futureBills: CreditCardBill[];
}

/** bento tile showing the total of all upcoming (future-status) bills + available credit + "antecipar" (pay early) cta, pairs with `CurrentStatementCard` on the current bill page */
export async function NextStatementsCard({
  cardId,
  available,
  futureBills,
}: NextStatementsCardProps) {
  const t = await getTranslations("creditCards");
  const futureTotal = futureBills.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3.5">
      <div>
        <p className="font-karantina text-2xl tracking-wide text-muted-foreground uppercase">
          {t("nextStatements")}
        </p>
        <p className="font-sans text-5xl font-bold text-foreground mt-1">
          {fmtCurrency(futureTotal)}
        </p>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-baseline justify-between">
        <p className="font-sans text-sm text-muted-foreground uppercase">
          {t("available")}
        </p>
        <p className="font-sans text-xl font-semibold text-highlight">
          {fmtCurrency(available)}
        </p>
      </div>
      <div className="mt-auto">
        <AnteciparDialog cardId={cardId} futureBills={futureBills} />
      </div>
    </div>
  );
}
