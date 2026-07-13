import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { fmtCurrency, parseLocalDate } from "@/lib/format";
import { mockCreditCard } from "@/lib/mock-monthly";

function CreditCardVisual({ name, brand }: { name: string; brand: string }) {
  return (
    <div
      className="relative w-full rounded-xl p-5 flex flex-col justify-between overflow-hidden shadow-lg"
      style={{
        background:
          "linear-gradient(150deg, color-mix(in oklch, var(--highlight) 80%, white), var(--highlight))",
        aspectRatio: "0.63",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <span className="font-karantina text-2xl tracking-wide text-white/90 uppercase">
          {name}
        </span>
      </div>

      <div className="relative z-10 flex justify-end items-center">
        {brand === "visa" && (
          <span className="font-bold italic text-white text-xl tracking-widest select-none">
            VISA
          </span>
        )}
        {brand === "mastercard" && (
          <div className="flex items-center -space-x-2">
            <div className="w-7 h-7 rounded-full bg-red-500/90" />
            <div className="w-7 h-7 rounded-full bg-orange-400/90" />
          </div>
        )}
        {brand !== "visa" && brand !== "mastercard" && (
          <span className="font-karantina text-base tracking-wide text-white/90 uppercase">
            {brand}
          </span>
        )}
      </div>
    </div>
  );
}

export async function CreditCardSection() {
  const t = await getTranslations("monthly");
  const locale = await getLocale();
  const card = mockCreditCard;

  const closingFormatted = parseLocalDate(card.closingDate).toLocaleDateString(
    locale === "pt-BR" ? "pt-BR" : "en-US",
    { month: "short", day: "numeric" },
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex gap-7">
        <div className="w-36 shrink-0">
          <CreditCardVisual name={card.name} brand={card.brand} />
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-baseline justify-between py-3">
              <span className="font-sans text-sm text-muted-foreground uppercase">
                {t("currentBill")}
              </span>
              <span className="font-sans text-3xl font-bold text-foreground">
                {fmtCurrency(card.currentBill)}
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
                {fmtCurrency(card.upcomingBills)}
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex items-center gap-1.5 font-karantina text-2xl tracking-wide uppercase text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {t("viewDetails")}
              <ArrowRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
