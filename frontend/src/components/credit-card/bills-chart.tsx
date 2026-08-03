"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { fmtCurrency, toIntlLocale } from "@/lib/format";
import type { CreditCardBill } from "@/lib/types";

interface BillsChartProps {
  bills: CreditCardBill[];
  selectedMonth: string;
  locale: string;
}

function monthLabel(month: string, locale: string): string {
  const [year, mon] = month.split("-").map(Number) as [number, number];
  return new Date(year, mon - 1, 1)
    .toLocaleString(toIntlLocale(locale), { month: "short" })
    .toUpperCase();
}

/** bar color: full highlight for the selected month, dimmed highlight for other current/future bills, dimmed gray for paid (past) ones */
function barFill(bill: CreditCardBill, selectedMonth: string): string {
  if (bill.month === selectedMonth) return "var(--highlight)";
  if (bill.status === "current" || bill.status === "future") {
    return "color-mix(in oklch, var(--highlight) 28%, transparent)";
  }
  return "color-mix(in oklch, var(--muted-foreground) 35%, transparent)";
}

interface TooltipPayload {
  payload?: CreditCardBill;
}

function CustomTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  const bill = payload[0]?.payload;
  if (!bill) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="font-sans text-xs text-muted-foreground uppercase mb-0.5">
        {monthLabel(bill.month, locale)}
      </p>
      <p className="font-sans text-sm font-semibold text-foreground">
        {fmtCurrency(bill.amount)}
      </p>
    </div>
  );
}

/**
 * recharts bar chart of all 13 months of bills
 *
 * clicking a bar updates the `?month=` search param (`router.push`), which is how the parent page decides `selectedMonth` — this chart is the only month-picker on the bills summary page
 */
export function BillsChart({ bills, selectedMonth, locale }: BillsChartProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="bg-card border border-border rounded-xl p-5 [&_.recharts-surface]:outline-none [&_path]:outline-none">
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={bills}
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="month"
            tickFormatter={(v: string) => monthLabel(v, locale)}
            tick={{
              fontSize: 11,
              fontFamily: "var(--font-sans)",
              fill: "var(--muted-foreground)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} cursor={false} />
          <Bar
            dataKey="amount"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            activeBar={false}
            // biome-ignore lint/suspicious/noExplicitAny: recharts merges bar geometry into click data
            onClick={(data: any) => {
              router.push(`${pathname}?month=${data.month}`, { scroll: false });
            }}
          >
            {bills.map((bill) => (
              <Cell
                key={bill.month}
                style={{ fill: barFill(bill, selectedMonth) }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
