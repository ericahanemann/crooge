/** maps a next-intl locale to the BCP-47 tag used by `Intl`/`toLocaleString` APIs (next-intl uses "en", `Intl` wants "en-US"). */
export function toIntlLocale(locale: string): string {
  return locale === "pt-BR" ? "pt-BR" : "en-US";
}

// always formats as brazilian reais with `pt-BR` grouping/decimal separators,
// regardless of the active UI locale — the app's only currency is BRL, so
// this is intentionally not locale-sensitive. sign is stripped (`Math.abs`);
// callers render the +/- themselves based on transaction type.
export function fmtCurrency(amount: number): string {
  return `R$${Math.abs(amount).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
