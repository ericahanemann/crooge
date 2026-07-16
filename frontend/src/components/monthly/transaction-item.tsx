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
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import type { Category, Transaction } from "@/lib/mock-monthly";

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

export async function TransactionItem({ tx }: { tx: Transaction }) {
  const t = await getTranslations("monthly");
  const tCat = await getTranslations("categories.expense");

  const Icon = categoryIcons[tx.category];
  const isExpense = tx.amount < 0;
  const formattedAmount = `${isExpense ? "-" : "+"}$${Math.abs(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="size-9 rounded-lg bg-highlight/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-highlight" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-karantina text-2xl tracking-wide text-foreground uppercase">
          {tCat(tx.category)}
        </p>
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-sans text-sm text-muted-foreground truncate">
            {tx.description}
          </p>
          {tx.timing === "oneTime" && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-sans text-xs text-muted-foreground shrink-0">
              {t("badgeOneTime")}
            </span>
          )}
          {tx.timing === "installment" && (
            <span className="inline-flex items-center rounded-full bg-highlight/10 px-2 py-0.5 font-sans text-xs text-highlight shrink-0">
              {t("badgeInstallment", {
                current: tx.installmentCurrent,
                total: tx.installmentTotal,
              })}
            </span>
          )}
          {tx.timing === "recurring" && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-sans text-xs text-muted-foreground shrink-0">
              {t("badgeRecurring")}
            </span>
          )}
        </div>
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
}
