/** Parses a "YYYY-MM" key into a `[start, end)` UTC date range covering that month. */
export function monthRange(month: string): { start: Date; end: Date } {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  const start = new Date(Date.UTC(year, mon - 1, 1));
  const end = new Date(Date.UTC(year, mon, 1));
  return { start, end };
}
