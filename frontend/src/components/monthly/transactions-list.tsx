import {
  type LucideIcon,
  Car,
  Coffee,
  Gamepad2,
  HeartPulse,
  Home,
  MonitorPlay,
  Music,
  Navigation,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Utensils,
  Zap,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "@/lib/format";
import type { Category, Transaction } from "@/lib/mock-monthly";
import { mockTransactions } from "@/lib/mock-monthly";

const categoryIcons: Record<Category, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingCart,
  transport: Car,
  rideshare: Navigation,
  streaming: MonitorPlay,
  music: Music,
  health: HeartPulse,
  shopping: ShoppingBag,
  utilities: Zap,
  housing: Home,
  entertainment: Gamepad2,
  coffee: Coffee,
  other: Tag,
};

export async function TransactionsList() {
  const t = await getTranslations("monthly");
  const tCat = await getTranslations("categories");
  const locale = await getLocale();

  const grouped = mockTransactions.reduce<Record<string, Transaction[]>>(
    (acc, tx) => {
      (acc[tx.date] ??= []).push(tx);
      return acc;
    },
    {},
  );

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {t("transactions")}
        </h2>
        <span className="font-karantina text-2xl tracking-wide text-muted-foreground">
          {mockTransactions.length}
        </span>
      </div>
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const txs = grouped[date];
          const formattedDate = parseLocalDate(date).toLocaleDateString(
            locale === "pt-BR" ? "pt-BR" : "en-US",
            { weekday: "long", month: "long", day: "numeric" },
          );
          return (
            <div key={date}>
              <p className="font-sans text-sm text-muted-foreground uppercase mb-2">
                {formattedDate}
              </p>
              <div className="space-y-1">
                {txs.map((tx) => {
                  const Icon = categoryIcons[tx.category];
                  const isExpense = tx.amount < 0;
                  const formattedAmount = `${isExpense ? "-" : "+"}$${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="size-9 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0">
                        <Icon
                          size={16}
                          className="text-highlight"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-karantina text-2xl tracking-wide text-foreground uppercase">
                          {tCat(tx.category)}
                        </p>
                        <p className="font-sans text-sm text-muted-foreground truncate">
                          {tx.description}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-sans font-semibold text-sm shrink-0",
                          isExpense ? "text-foreground" : "text-highlight",
                        )}
                      >
                        {formattedAmount}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
