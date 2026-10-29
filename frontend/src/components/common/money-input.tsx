import type * as React from "react";
import { Input } from "@/components/ui/input";
import { currencySymbol } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Amount `Input` with the currency symbol drawn inside its left edge. The
 * left padding grows with the symbol's length so a multi-character symbol
 * ("R$") never overlaps the typed value.
 */
export function MoneyInput({
  currency,
  className,
  ...props
}: React.ComponentProps<"input"> & { currency: string }) {
  const symbol = currencySymbol(currency);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {symbol}
      </span>
      <Input
        inputMode="decimal"
        placeholder="0.00"
        className={cn(symbol.length > 1 ? "pl-9" : "pl-6", className)}
        {...props}
      />
    </div>
  );
}
