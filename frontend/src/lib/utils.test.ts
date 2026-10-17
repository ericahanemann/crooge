import { describe, expect, it } from "vitest";
import { parseAmountInput } from "./utils";

describe("parseAmountInput", () => {
  it("parses a plain dot-decimal amount", () => {
    expect(parseAmountInput("14.50")).toBe(14.5);
  });

  it("treats a comma as equivalent to a dot", () => {
    expect(parseAmountInput("14,50")).toBe(14.5);
  });

  it("parses a whole number with no separator", () => {
    expect(parseAmountInput("100")).toBe(100);
  });

  it("trims surrounding whitespace", () => {
    expect(parseAmountInput("  14,50  ")).toBe(14.5);
  });

  it("returns NaN for a non-numeric string", () => {
    expect(parseAmountInput("abc")).toBeNaN();
  });
});
