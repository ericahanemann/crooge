import { describe, expect, it } from "vitest";
import { getCycleForDate } from "../../../src/modules/credit-cards/billing-cycle.ts";

describe("getCycleForDate", () => {
  it("stays in the current month's cycle when the day is on or before closingDay", () => {
    const result = getCycleForDate(10, 20, new Date(Date.UTC(2026, 2, 5)));
    expect(result.cycleMonth).toBe("2026-03");
  });

  it("rolls into next month's cycle when the day is after closingDay", () => {
    const result = getCycleForDate(10, 20, new Date(Date.UTC(2026, 2, 15)));
    expect(result.cycleMonth).toBe("2026-04");
  });

  it("rolls the cycle year over in December", () => {
    const result = getCycleForDate(10, 20, new Date(Date.UTC(2025, 11, 15)));
    expect(result.cycleMonth).toBe("2026-01");
  });

  it("rolls the due date's own month and year over when the cycle lands in December", () => {
    const result = getCycleForDate(10, 20, new Date(Date.UTC(2025, 10, 15)));
    expect(result.cycleMonth).toBe("2025-12");
    expect(result.dueDate).toEqual(new Date(Date.UTC(2026, 0, 20)));
  });
});
