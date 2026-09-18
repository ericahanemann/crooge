import { describe, expect, it } from "vitest";
import {
  generateInstallments,
  occurrenceInRange,
} from "../../../src/modules/transactions/generate-occurrences.ts";

describe("generateInstallments", () => {
  it("splits an amount with a rounding remainder into the last installment", () => {
    const { occurrences } = generateInstallments(
      100,
      3,
      new Date(Date.UTC(2026, 0, 5)),
    );

    const amounts = occurrences.map((o) => o.amount);
    expect(amounts).toEqual([33.33, 33.33, 33.34]);
    expect(amounts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
  });

  it("splits an exactly divisible amount evenly", () => {
    const { occurrences } = generateInstallments(
      100,
      4,
      new Date(Date.UTC(2026, 0, 5)),
    );

    expect(occurrences.map((o) => o.amount)).toEqual([25, 25, 25, 25]);
  });

  it("handles a small total with a remainder", () => {
    const { occurrences } = generateInstallments(
      10,
      3,
      new Date(Date.UTC(2026, 0, 5)),
    );

    expect(occurrences.map((o) => o.amount)).toEqual([3.33, 3.33, 3.34]);
  });

  it("spaces occurrences one month apart, rolling over into the next year", () => {
    const { occurrences } = generateInstallments(
      300,
      3,
      new Date(Date.UTC(2026, 11, 15)),
    );

    expect(occurrences.map((o) => o.date.toISOString().slice(0, 10))).toEqual([
      "2026-12-15",
      "2027-01-15",
      "2027-02-15",
    ]);
  });

  it("shares one groupId and assigns 1-based installmentCurrent/Total", () => {
    const { groupId, occurrences } = generateInstallments(
      300,
      3,
      new Date(Date.UTC(2026, 0, 5)),
    );

    expect(occurrences.every((o) => o.installmentTotal === 3)).toBe(true);
    expect(occurrences.map((o) => o.installmentCurrent)).toEqual([1, 2, 3]);
    expect(typeof groupId).toBe("string");
    expect(groupId.length).toBeGreaterThan(0);
  });
});

describe("occurrenceInRange", () => {
  it("includes an occurrence landing exactly on rangeStart", () => {
    const startDate = new Date(Date.UTC(2026, 0, 1));
    const result = occurrenceInRange(
      startDate,
      "MONTHLY",
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 1, 1)),
    );
    expect(result).toEqual(startDate);
  });

  it("excludes an occurrence landing exactly on rangeEnd", () => {
    const startDate = new Date(Date.UTC(2026, 0, 1));
    const result = occurrenceInRange(
      startDate,
      "MONTHLY",
      new Date(Date.UTC(2025, 11, 1)),
      new Date(Date.UTC(2026, 0, 1)),
    );
    expect(result).toBeNull();
  });

  it("reflects the actual (not idealized) landing date for a Jan-31 monthly series", () => {
    const startDate = new Date(Date.UTC(2026, 0, 31));

    const february = occurrenceInRange(
      startDate,
      "MONTHLY",
      new Date(Date.UTC(2026, 1, 1)),
      new Date(Date.UTC(2026, 2, 1)),
    );
    expect(february).toBeNull();

    const march = occurrenceInRange(
      startDate,
      "MONTHLY",
      new Date(Date.UTC(2026, 2, 1)),
      new Date(Date.UTC(2026, 3, 1)),
    );
    expect(march).toEqual(new Date(Date.UTC(2026, 2, 3)));
  });

  it("matches an annual series only once every 12 months", () => {
    const startDate = new Date(Date.UTC(2026, 0, 1));

    for (let month = 0; month < 12; month++) {
      const result = occurrenceInRange(
        startDate,
        "ANNUAL",
        new Date(Date.UTC(2026, month, 1)),
        new Date(Date.UTC(2026, month + 1, 1)),
      );
      if (month === 0) {
        expect(result).toEqual(startDate);
      } else {
        expect(result).toBeNull();
      }
    }

    const nextYear = occurrenceInRange(
      startDate,
      "ANNUAL",
      new Date(Date.UTC(2027, 0, 1)),
      new Date(Date.UTC(2027, 1, 1)),
    );
    expect(nextYear).toEqual(new Date(Date.UTC(2027, 0, 1)));
  });
});
