import { describe, expect, it } from "vitest";
import { billStatus } from "../../../src/modules/credit-cards/bill.ts";

describe("billStatus", () => {
  it("is paid when paidAt is set, regardless of cycleMonth", () => {
    const result = billStatus(
      { paidAt: new Date(), cycleMonth: "2026-11" },
      "2026-11",
    );
    expect(result).toBe("paid");
  });

  it("is current only when cycleMonth matches today's live cycle exactly", () => {
    const result = billStatus(
      { paidAt: null, cycleMonth: "2026-11" },
      "2026-11",
    );
    expect(result).toBe("current");
  });

  it("is overdue for an unpaid bill that closed before the live cycle", () => {
    const result = billStatus(
      { paidAt: null, cycleMonth: "2026-09" },
      "2026-11",
    );
    expect(result).toBe("overdue");
  });

  it("is future for an unpaid bill that hasn't opened yet", () => {
    const result = billStatus(
      { paidAt: null, cycleMonth: "2027-01" },
      "2026-11",
    );
    expect(result).toBe("future");
  });
});
