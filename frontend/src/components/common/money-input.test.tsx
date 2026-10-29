import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MoneyInput } from "./money-input";

describe("MoneyInput", () => {
  it("pads wider for a multi-character symbol so it never overlaps the value", () => {
    render(<MoneyInput currency="BRL" aria-label="amount" />);
    expect(screen.getByText("R$")).toBeInTheDocument();
    expect(screen.getByLabelText("amount")).toHaveClass("pl-9");
  });

  it("keeps the narrow padding for a single-character symbol", () => {
    render(<MoneyInput currency="USD" aria-label="amount" />);
    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByLabelText("amount")).toHaveClass("pl-6");
  });
});
