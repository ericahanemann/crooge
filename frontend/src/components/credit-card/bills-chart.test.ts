import { describe, expect, it } from "vitest";
import type { CreditCardBill } from "@/lib/types";
import { barFill } from "./bills-chart";

function bill(
  status: CreditCardBill["status"],
  month = "2026-09",
): CreditCardBill {
  return { month, amount: 100, status, closingDate: "", dueDate: "" };
}

describe("barFill", () => {
  it("highlights the selected month regardless of status", () => {
    expect(barFill(bill("paid"), "2026-09")).toBe("var(--highlight)");
  });

  it("dims the highlight (not gray) for an overdue bill, same as current/future — it's still unpaid", () => {
    const current = barFill(bill("current"), "2026-11");
    const overdue = barFill(bill("overdue"), "2026-11");
    const future = barFill(bill("future"), "2026-11");
    expect(overdue).toBe(current);
    expect(overdue).toBe(future);
  });

  it("grays out a paid bill that isn't the selected month", () => {
    const paid = barFill(bill("paid"), "2026-11");
    const current = barFill(bill("current"), "2026-11");
    expect(paid).not.toBe(current);
  });
});
