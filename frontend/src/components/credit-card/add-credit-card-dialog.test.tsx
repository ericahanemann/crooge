import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCreditCardAction,
  updateCreditCardAction,
} from "@/lib/credit-card-actions";
import type { CreditCardSummary } from "@/lib/types";
import { render } from "../../../tests/setup/test-utils";
import { AddCreditCardDialog } from "./add-credit-card-dialog";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/credit-card-actions", () => ({
  createCreditCardAction: vi.fn(),
  updateCreditCardAction: vi.fn(),
}));

const existingCard: CreditCardSummary = {
  id: "card-1",
  name: "Nubank",
  brand: "mastercard",
  limit: 2000,
  closingDay: 10,
  dueDay: 20,
  available: 2000,
  currentMonth: "2026-03",
};

describe("AddCreditCardDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(createCreditCardAction).mockResolvedValue({ ok: true });
    vi.mocked(updateCreditCardAction).mockResolvedValue({ ok: true });
  });

  it("renders the primary CTA trigger in add mode by default", () => {
    render(<AddCreditCardDialog />);

    expect(
      screen.getByRole("button", { name: "+ ADD NEW CARD" }),
    ).toBeInTheDocument();
  });

  it("renders a compact icon-only trigger (no visible label) in add/icon mode", () => {
    render(<AddCreditCardDialog variant="icon" />);

    const trigger = screen.getByRole("button", { name: "+ ADD NEW CARD" });
    expect(trigger).toHaveAttribute("title", "+ ADD NEW CARD");
    expect(trigger).toHaveTextContent("");
  });

  it("always renders the pencil icon trigger in edit mode, regardless of variant", () => {
    render(<AddCreditCardDialog card={existingCard} variant="primary" />);

    expect(
      screen.queryByRole("button", { name: "+ ADD NEW CARD" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "EDIT CARD" }),
    ).toBeInTheDocument();
  });

  it("prefills fields from the card in edit mode", async () => {
    const user = userEvent.setup();
    render(<AddCreditCardDialog card={existingCard} />);

    await user.click(screen.getByRole("button", { name: "EDIT CARD" }));

    expect(screen.getByLabelText("CARD NAME")).toHaveValue("Nubank");
    expect(screen.getByLabelText("LIMIT")).toHaveValue("2000");
    expect(screen.getByLabelText("CLOSING DAY")).toHaveValue(10);
    expect(screen.getByLabelText("DUE DAY")).toHaveValue(20);
  });

  it("validates name/limit/closingDay/dueDay", async () => {
    const user = userEvent.setup();
    render(<AddCreditCardDialog />);

    await user.click(screen.getByRole("button", { name: "+ ADD NEW CARD" }));
    await user.clear(screen.getByLabelText("LIMIT"));
    await user.type(screen.getByLabelText("LIMIT"), "-5");
    await user.clear(screen.getByLabelText("CLOSING DAY"));
    await user.type(screen.getByLabelText("CLOSING DAY"), "29");
    await user.clear(screen.getByLabelText("DUE DAY"));
    await user.type(screen.getByLabelText("DUE DAY"), "0");
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Must be a positive number")).toBeInTheDocument();
    expect(screen.getAllByText("Must be between 1 and 28")).toHaveLength(2);
    expect(createCreditCardAction).not.toHaveBeenCalled();
  });

  it("submits a new card with the parsed numeric fields", async () => {
    const user = userEvent.setup();
    render(<AddCreditCardDialog />);

    await user.click(screen.getByRole("button", { name: "+ ADD NEW CARD" }));
    await user.type(screen.getByLabelText("CARD NAME"), "Nubank");
    await user.type(screen.getByLabelText("LIMIT"), "1000");
    await user.clear(screen.getByLabelText("CLOSING DAY"));
    await user.type(screen.getByLabelText("CLOSING DAY"), "5");
    await user.clear(screen.getByLabelText("DUE DAY"));
    await user.type(screen.getByLabelText("DUE DAY"), "15");
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createCreditCardAction).toHaveBeenCalledWith({
      name: "Nubank",
      brand: "visa",
      limit: 1000,
      closingDay: 5,
      dueDay: 15,
    });
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("submits an edit with the card's id", async () => {
    const user = userEvent.setup();
    render(<AddCreditCardDialog card={existingCard} />);

    await user.click(screen.getByRole("button", { name: "EDIT CARD" }));
    await user.click(screen.getByRole("button", { name: "SAVE" }));

    expect(updateCreditCardAction).toHaveBeenCalledWith("card-1", {
      name: "Nubank",
      brand: "mastercard",
      limit: 2000,
      closingDay: 10,
      dueDay: 20,
    });
  });

  it("shows the generic error message on submit failure", async () => {
    vi.mocked(createCreditCardAction).mockResolvedValue({
      ok: false,
      message: "request failed",
    });
    const user = userEvent.setup();
    render(<AddCreditCardDialog />);

    await user.click(screen.getByRole("button", { name: "+ ADD NEW CARD" }));
    await user.type(screen.getByLabelText("CARD NAME"), "Nubank");
    await user.type(screen.getByLabelText("LIMIT"), "1000");
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("starts with a fresh form for a different card (as key={card.id} forces on switch)", async () => {
    const user = userEvent.setup();
    const first = render(<AddCreditCardDialog card={existingCard} />);
    await user.click(screen.getByRole("button", { name: "EDIT CARD" }));
    const nameInput = screen.getByLabelText("CARD NAME");
    await user.clear(nameInput);
    await user.type(nameInput, "Dirtied name");
    first.unmount();

    const otherCard: CreditCardSummary = {
      ...existingCard,
      id: "card-2",
      name: "Inter",
      limit: 500,
    };
    render(<AddCreditCardDialog card={otherCard} />);
    await user.click(screen.getByRole("button", { name: "EDIT CARD" }));

    expect(screen.getByLabelText("CARD NAME")).toHaveValue("Inter");
    expect(screen.getByLabelText("LIMIT")).toHaveValue("500");
  });
});
