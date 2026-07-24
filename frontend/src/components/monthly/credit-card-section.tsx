import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { CardVisual } from "@/components/credit-card/card-visual";
import { Link } from "@/i18n/navigation";
import { getCreditCard } from "@/lib/data";
import { fmtCurrency, parseLocalDate, toIntlLocale } from "@/lib/format";

export async function CreditCardSection() {
  const t = await getTranslations("monthly");
  const locale = await getLocale();
  const card = await getCreditCard();

  // biome-ignore lint/style/noNonNullAssertion: mock data always has a current bill
  const currentBill = card.bills.find((b) => b.status === "current")!;
  const upcomingBills = card.bills
    .filter((b) => b.status === "future")
    .reduce((sum, b) => sum + b.amount, 0);

  const closingFormatted = parseLocalDate(
    currentBill.closingDate,
  ).toLocaleDateString(toIntlLocale(locale), {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex flex-col md:flex-row gap-7">
        {/* Mobile: landscape card, full width */}
        <div className="w-full aspect-[1.587] md:hidden">
          <CardVisual name={card.name} brand={card.brand} />
        </div>
        {/* Desktop: portrait card */}
        <div
          className="hidden md:block w-36 shrink-0"
          style={{ aspectRatio: "0.63" }}
        >
          <CardVisual name={card.name} brand={card.brand} />
        </div>
        <div className="flex-1 flex flex-col md:justify-between">
          <div>
            <div className="flex items-baseline justify-between py-3">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {t("currentBill")}
              </span>
              <span className="font-sans text-3xl font-bold text-foreground">
                {fmtCurrency(currentBill.amount)}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-baseline justify-between py-3">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {t("closingDate")}
              </span>
              <span className="font-sans text-base font-semibold text-foreground">
                {closingFormatted}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-baseline justify-between py-3">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {t("upcoming")}
              </span>
              <span className="font-sans text-base font-semibold text-muted-foreground">
                {fmtCurrency(upcomingBills)}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <Link
              href="/credit-cards/current-bill"
              className="flex items-center gap-1.5 font-karantina text-2xl tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("viewDetails")}
              <ArrowRight size={14} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
