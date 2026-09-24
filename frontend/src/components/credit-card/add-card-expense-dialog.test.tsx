import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCategoriesAction } from "@/lib/category-actions";
import { payCreditCardBillAction } from "@/lib/credit-card-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import { render } from "../../../tests/setup/test-utils";
import { AddCardExpenseDialog } from "./add-card-expense-dialog";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/category-actions", () => ({
  listCategoriesAction: vi.fn(),
  createCategoryAction: vi.fn(),
  updateCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
}));

vi.mock("@/lib/transaction-actions", () => ({
  createTransactionAction: vi.fn(),
}));

vi.mock("@/lib/credit-card-actions", () => ({
  payCreditCardBillAction: vi.fn(),
}));

const travelCategory = {
  id: "cat-travel",
  kind: "expense" as const,
  label: "Travel",
  icon: "plane",
  isFallback: false,
  isSystem: false,
};

async function openDialog() {
  const user = userEvent.setup();
  render(<AddCardExpenseDialog cardId="card-1" billMonth="2026-03" />);
  await user.click(screen.getByRole("button", { name: "+ ADD" }));
  return user;
}

describe("AddCardExpenseDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(listCategoriesAction).mockResolvedValue([travelCategory]);
    vi.mocked(createTransactionAction).mockResolvedValue({ ok: true });
    vi.mocked(payCreditCardBillAction).mockResolvedValue({ ok: true });
  });

  it("defaults to expense mode, showing description and category", async () => {
    await openDialog();

    expect(screen.getByLabelText("NAME")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("switching to pay mode hides description/category", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "PAYMENT" }));

    expect(screen.queryByLabelText("NAME")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
    ).toBeInTheDocument();
  });

  it("submits an expense with paymentMethod credit, the fixed card id, and timing one_time", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Coffee");
    await user.type(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
      "15",
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Travel"));
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createTransactionAction).toHaveBeenCalledWith({
      type: "expense",
      description: "Coffee",
      category: "cat-travel",
      amount: 15,
      date: todayISO(),
      paymentMethod: "credit",
      creditCardId: "card-1",
      timing: "one_time",
    });
  });

  it("requires description and category in expense mode", async () => {
    const user = await openDialog();

    await user.type(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
      "15",
    );
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findAllByText("Required")).toHaveLength(2);
    expect(createTransactionAction).not.toHaveBeenCalled();
  });

  it("pays the bill in pay mode without needing description/category", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "PAYMENT" }));
    await user.type(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
      "200",
    );
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(payCreditCardBillAction).toHaveBeenCalledWith(
      "card-1",
      "2026-03",
      200,
    );
  });

  it("maps a 422 to the credit-limit message in expense mode", async () => {
    vi.mocked(createTransactionAction).mockResolvedValue({
      ok: false,
      code: "credit_limit_exceeded",
      message: "purchase exceeds available credit",
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Coffee");
    await user.type(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
      "15",
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Travel"));
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText(
        "This purchase exceeds the card's available credit",
      ),
    ).toBeInTheDocument();
  });

  it("falls through to the generic message on a pay-mode failure (no credit-limit mapping there)", async () => {
    vi.mocked(payCreditCardBillAction).mockResolvedValue({
      ok: false,
      message: "bill not found",
    });
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "PAYMENT" }));
    await user.type(
      screen.getByLabelText("AMOUNT", { selector: "input" }),
      "200",
    );
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });
});
