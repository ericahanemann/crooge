/** maps a next-intl locale to the BCP-47 tag used by `Intl`/`toLocaleString` APIs (next-intl uses "en", `Intl` wants "en-US"). */
export function toIntlLocale(locale: string): string {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: "R$",
  USD: "$",
  EUR: "€",
};

/** Symbol for a bare amount input's prefix decoration (e.g. the "R$" beside the Antecipar amount field) — not a full currency-formatted string. */
export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

// Display-only: `currency` changes how an amount is *formatted*, never what
// it's worth — this never converts the underlying value (see
// `docs/edit-profile-spec.md`). Sign is stripped (`Math.abs`); callers
// render the +/- themselves based on transaction type.
//
// BRL keeps its own hand-built formatting rather than
// `Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})`, which
// inserts a non-breaking space after the symbol ("R$ 1.234,56") — this app
// has always rendered "R$1.234,56" with no space, and every existing test
// (and the DESIGN.md-documented look) was written against that. Every
// other currency goes through `Intl.NumberFormat` properly, which is also
// how BRL used to be *not* handled (it was the one hardcoded case) before
// `currency` became a per-user preference instead of a fixed assumption.
export function fmtCurrency(amount: number, currency: string): string {
  const abs = Math.abs(amount);
  if (currency === "BRL") {
    return `R$${abs.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(abs);
}

// parses a "YYYY-MM-DD" string into a local-midnight date. deliberately
// avoids `new Date(dateStr)`, which parses as UTC midnight and can shift a
// day backward when rendered in a negative-UTC-offset timezone.
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(year, month - 1, day);
}

/** today's date as "YYYY-MM-DD" in the local timezone (not UTC). */
export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}
