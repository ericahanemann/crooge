import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { fmtCurrency, parseLocalDate, toIntlLocale } from "@/lib/format";
import type { CreditCardDetail } from "@/lib/types";
import { AddCreditCardDialog } from "./add-credit-card-dialog";
import { CardSelector } from "./card-selector";
import { CardVisual } from "./card-visual";

interface CardOption {
  id: string;
  name: string;
}

/**
 * @prop card - full detail for the currently selected card
 * @prop cards - all cards for the `CardSelector` dropdown (id + name only)
 * @prop selectedMonth - passed through to the "see summary" link's query string so bills-summary opens on the same month the user was viewing
 */
interface CardShowcaseProps {
  card: CreditCardDetail;
  cards: CardOption[];
  selectedCard: string;
  locale: string;
  selectedMonth: string;
}

/**
 * top bento tile on the credit cards pages
 */
export async function CardShowcase({
  card,
  cards,
  selectedCard,
  locale,
  selectedMonth,
}: CardShowcaseProps) {
  const t = await getTranslations("creditCards");

  // `getCreditCard` (lib/data.ts) always splices a synthesized current bill
  // into `bills` even for a brand-new card with no persisted bill row yet,
  // but guard here too rather than trust that invariant with a non-null
  // assertion — a missing current bill degrades to "—" instead of crashing.
  const currentBill = card.bills.find((b) => b.status === "current");
  const localeStr = toIntlLocale(locale);

  const fmt = (dateStr?: string) =>
    dateStr
      ? parseLocalDate(dateStr).toLocaleDateString(localeStr, {
          month: "short",
          day: "numeric",
        })
      : "—";

  const usedPct = Math.round(
    ((card.limit - card.available) / card.limit) * 100,
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* mobile: landscape card full-width on top */}
      <div className="w-full aspect-[1.587] md:hidden mb-5">
        <CardVisual name={card.name} brand={card.brand} />
      </div>
      <div className="flex gap-7">
        {/* desktop: portrait card on the left */}
        <div
          className="hidden md:block w-48 shrink-0"
          style={{ aspectRatio: "0.63" }}
        >
          <CardVisual name={card.name} brand={card.brand} />
        </div>
        <div className="flex-1 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <CardSelector cards={cards} selectedCard={selectedCard} />
            <AddCreditCardDialog key={card.id} card={card} />
            <AddCreditCardDialog variant="icon" />
          </div>
          <div className="h-px bg-border" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-sans text-sm text-muted-foreground uppercase">
                {t("closingDate")}
              </p>
              <p className="font-sans text-xl font-semibold text-foreground">
                {fmt(currentBill?.closingDate)}
              </p>
            </div>
            <div>
              <p className="font-sans text-sm text-muted-foreground uppercase">
                {t("dueDate")}
              </p>
              <p className="font-sans text-xl font-semibold text-foreground">
                {fmt(currentBill?.dueDate)}
              </p>
            </div>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-baseline justify-between">
            <div>
              <p className="font-sans text-sm text-muted-foreground uppercase">
                {t("used")}
              </p>
              <p className="font-sans text-xl font-semibold text-foreground">
                {fmtCurrency(card.limit - card.available)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-sans text-sm text-muted-foreground uppercase">
                {t("limit")}
              </p>
              <p className="font-sans text-xl font-semibold text-muted-foreground">
                {fmtCurrency(card.limit)}
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-highlight transition-all"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-end">
            <Link
              href={{
                pathname: "/credit-cards/bills-summary",
                query: { card: card.id, month: selectedMonth },
              }}
              className="flex items-center gap-1.5 font-karantina text-2xl tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("seeSummary")}
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
