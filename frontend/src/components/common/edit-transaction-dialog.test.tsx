import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCategoriesAction } from "@/lib/category-actions";
import { updateTransactionAction } from "@/lib/transaction-actions";
import { render } from "../../../tests/setup/test-utils";
import {
  type EditableTransaction,
  EditTransactionDialog,
} from "./edit-transaction-dialog";

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
  updateTransactionAction: vi.fn(),
}));

const travelCategory = {
  id: "cat-travel",
  kind: "expense" as const,
  label: "Travel",
  icon: "plane",
  isFallback: false,
  isSystem: false,
};

const oneTimeExpense: EditableTransaction = {
  id: "t1",
  description: "Groceries",
  amount: 150,
  date: "2026-03-05",
  category: "cat-travel",
  isIncome: false,
  timing: "oneTime",
  paymentMethod: "debit_pix",
};

const installmentExpense: EditableTransaction = {
  id: "t2",
  description: "Sofa",
  amount: 100,
  date: "2026-03-05",
  category: "cat-travel",
  isIncome: false,
  timing: "installment",
  paymentMethod: "credit",
  creditCardId: "card-1",
};

const oneTimeCreditExpense: EditableTransaction = {
  id: "t3",
  description: "Flight",
  amount: 500,
  date: "2026-03-05",
  category: "cat-travel",
  isIncome: false,
  timing: "oneTime",
  paymentMethod: "credit",
  creditCardId: "card-9",
};

describe("EditTransactionDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(listCategoriesAction).mockResolvedValue([travelCategory]);
    vi.mocked(updateTransactionAction).mockResolvedValue({ ok: true });
  });

  it("shows every field, pre-filled, for a one-time transaction", async () => {
    render(
      <EditTransactionDialog
        transaction={oneTimeExpense}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByLabelText("NAME")).toHaveValue("Groceries");
    expect(screen.getByLabelText("AMOUNT")).toHaveValue("150");
    expect(screen.getByLabelText("DATE")).toHaveValue("2026-03-05");
    expect(
      screen.queryByText(/only the name and category can be edited/i),
    ).not.toBeInTheDocument();
  });

  it("only shows description + category for a series occurrence, plus a notice", async () => {
    render(
      <EditTransactionDialog
        transaction={installmentExpense}
        open
        onOpenChange={vi.fn()}
      />,
    );

    expect(await screen.findByLabelText("NAME")).toHaveValue("Sofa");
    expect(screen.queryByLabelText("AMOUNT")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("DATE")).not.toBeInTheDocument();
    expect(
      screen.getByText(/only the name and category can be edited/i),
    ).toBeInTheDocument();
  });

  it("hides the payment-method toggle when fixedCreditCardId is set", async () => {
    render(
      <EditTransactionDialog
        transaction={oneTimeExpense}
        open
        onOpenChange={vi.fn()}
        fixedCreditCardId="card-1"
      />,
    );

    await screen.findByLabelText("NAME");
    expect(screen.queryByText("DEBIT / PIX")).not.toBeInTheDocument();
    expect(screen.queryByText("CREDIT")).not.toBeInTheDocument();
  });

  it("still validates description/category on a locked series row", async () => {
    const user = userEvent.setup();
    render(
      <EditTransactionDialog
        transaction={installmentExpense}
        open
        onOpenChange={vi.fn()}
      />,
    );

    const description = await screen.findByLabelText("NAME");
    await user.clear(description);
    await user.click(screen.getByRole("button", { name: "SAVE" }));

    expect(await screen.findByText("Required")).toBeInTheDocument();
    expect(updateTransactionAction).not.toHaveBeenCalled();
  });

  it("preserves the row's existing creditCardId when payment method is unchanged", async () => {
    const user = userEvent.setup();
    render(
      <EditTransactionDialog
        transaction={oneTimeCreditExpense}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await screen.findByLabelText("NAME");
    await user.click(screen.getByRole("button", { name: "SAVE" }));

    expect(updateTransactionAction).toHaveBeenCalledWith("t3", {
      description: "Flight",
      category: "cat-travel",
      amount: 500,
      date: "2026-03-05",
      paymentMethod: "credit",
      creditCardId: "card-9",
    });
  });

  it("submits the update and closes on success", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <EditTransactionDialog
        transaction={oneTimeExpense}
        open
        onOpenChange={onOpenChange}
      />,
    );

    const description = await screen.findByLabelText("NAME");
    await user.clear(description);
    await user.type(description, "Weekly groceries");
    await user.click(screen.getByRole("button", { name: "SAVE" }));

    expect(updateTransactionAction).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({ description: "Weekly groceries" }),
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("maps credit_limit_exceeded to the credit-limit message, and any other failure to generic", async () => {
    vi.mocked(updateTransactionAction).mockResolvedValueOnce({
      ok: false,
      code: "credit_limit_exceeded",
      message: "purchase exceeds available credit",
    });
    const user = userEvent.setup();
    render(
      <EditTransactionDialog
        transaction={oneTimeExpense}
        open
        onOpenChange={vi.fn()}
      />,
    );

    await screen.findByLabelText("NAME");
    await user.click(screen.getByRole("button", { name: "SAVE" }));

    expect(
      await screen.findByText(
        "This purchase exceeds the card's available credit",
      ),
    ).toBeInTheDocument();
  });
});
