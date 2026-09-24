import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCategoriesAction } from "@/lib/category-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import { render } from "../../../tests/setup/test-utils";
import { AddExpenseDialog } from "./add-expense-dialog";

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
  render(<AddExpenseDialog />);
  await user.click(screen.getByRole("button", { name: "+ ADD EXPENSE" }));
  return user;
}

async function selectCategory(user: ReturnType<typeof userEvent.setup>) {
  // When timing is "recurring" the frequency Select is also a combobox —
  // exclude it by id to reliably target the category picker's trigger.
  const combobox = screen
    .getAllByRole("combobox")
    .find((el) => el.id !== "expense-frequency");
  if (!combobox) throw new Error("category combobox not found");
  await user.click(combobox);
  await user.click(await screen.findByText("Travel"));
}

describe("AddExpenseDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(listCategoriesAction).mockResolvedValue([travelCategory]);
    vi.mocked(createTransactionAction).mockResolvedValue({ ok: true });
  });

  it("defaults to debit/pix + one-time, showing only the one-time fields", async () => {
    await openDialog();

    expect(screen.getByLabelText("NAME")).toBeInTheDocument();
    expect(screen.queryByLabelText("TOTAL AMOUNT")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("INSTALLMENTS")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("FREQUENCY")).not.toBeInTheDocument();
  });

  it("switching timing to installments reveals the installment fields and live per-month helper", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "INSTALLMENTS" }));

    await user.type(screen.getByLabelText("TOTAL AMOUNT"), "300");
    const installmentsInput = screen.getByLabelText("INSTALLMENTS");
    await user.clear(installmentsInput);
    await user.type(installmentsInput, "3");

    expect(await screen.findByText(/≈ R\$100,00/)).toBeInTheDocument();
  });

  it("rejects installments below 2", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "INSTALLMENTS" }));
    await user.type(screen.getByLabelText("TOTAL AMOUNT"), "100");
    const installmentsInput = screen.getByLabelText("INSTALLMENTS");
    await user.clear(installmentsInput);
    await user.type(installmentsInput, "1");
    await user.type(screen.getByLabelText("NAME"), "Sofa");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findByText("Must be at least 2")).toBeInTheDocument();
    expect(createTransactionAction).not.toHaveBeenCalled();
  });

  it("switching timing to recurring reveals the frequency select, defaulting to monthly", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "RECURRING" }));

    expect(screen.getByLabelText("FREQUENCY")).toHaveTextContent("MONTHLY");
  });

  it("submits a one-time expense with the expected payload", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Groceries");
    await user.type(screen.getByLabelText("AMOUNT"), "150");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createTransactionAction).toHaveBeenCalledWith({
      type: "expense",
      description: "Groceries",
      amount: 150,
      date: todayISO(),
      category: "cat-travel",
      paymentMethod: "debit_pix",
      timing: "one_time",
      installments: undefined,
      frequency: undefined,
    });
  });

  it("submits an installment expense on credit with the expected payload", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: /^credit/i }));
    await user.click(screen.getByRole("button", { name: "INSTALLMENTS" }));
    await user.type(screen.getByLabelText("TOTAL AMOUNT"), "300");
    const installmentsInput = screen.getByLabelText("INSTALLMENTS");
    await user.clear(installmentsInput);
    await user.type(installmentsInput, "3");
    await user.type(screen.getByLabelText("NAME"), "Sofa");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createTransactionAction).toHaveBeenCalledWith({
      type: "expense",
      description: "Sofa",
      amount: 300,
      date: todayISO(),
      category: "cat-travel",
      paymentMethod: "credit",
      timing: "installments",
      installments: 3,
      frequency: undefined,
    });
  });

  it("submits a recurring expense with the expected payload", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "RECURRING" }));
    await user.click(screen.getByLabelText("FREQUENCY"));
    await user.click(screen.getByText("ANNUAL"));
    await user.type(screen.getByLabelText("NAME"), "Insurance");
    await user.type(screen.getByLabelText("AMOUNT"), "1200");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createTransactionAction).toHaveBeenCalledWith({
      type: "expense",
      description: "Insurance",
      amount: 1200,
      date: todayISO(),
      category: "cat-travel",
      paymentMethod: "debit_pix",
      timing: "recurring",
      installments: undefined,
      frequency: "annual",
    });
  });

  it("maps no_credit_card to the 'add a credit card' message", async () => {
    vi.mocked(createTransactionAction).mockResolvedValue({
      ok: false,
      code: "no_credit_card",
      message: "no credit card",
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Flight");
    await user.type(screen.getByLabelText("AMOUNT"), "100");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText(
        "Add a credit card before charging expenses to it",
      ),
    ).toBeInTheDocument();
  });

  it("maps credit_limit_exceeded to the credit-limit message", async () => {
    vi.mocked(createTransactionAction).mockResolvedValue({
      ok: false,
      code: "credit_limit_exceeded",
      message: "purchase exceeds available credit",
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Flight");
    await user.type(screen.getByLabelText("AMOUNT"), "100");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText(
        "This purchase exceeds the card's available credit",
      ),
    ).toBeInTheDocument();
  });

  it("maps any other failure to the generic error message", async () => {
    vi.mocked(createTransactionAction).mockResolvedValue({
      ok: false,
      code: "unknown",
      message: "internal server error",
    });
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Flight");
    await user.type(screen.getByLabelText("AMOUNT"), "100");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("keep adding clears description/amount/installments but keeps timing/frequency/payment method/date/category", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /^credit/i }));
    await user.click(screen.getByRole("button", { name: "RECURRING" }));
    await user.click(screen.getByLabelText("FREQUENCY"));
    await user.click(screen.getByText("ANNUAL"));
    await user.type(screen.getByLabelText("NAME"), "Insurance");
    await user.type(screen.getByLabelText("AMOUNT"), "1200");
    await selectCategory(user);
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findByText("Added")).toBeInTheDocument();
    expect(screen.getByLabelText("NAME")).toHaveValue("");
    expect(screen.getByLabelText("AMOUNT")).toHaveValue("");
    // still recurring + annual + credit + the same category
    expect(screen.getByLabelText("FREQUENCY")).toHaveTextContent("ANNUAL");
    expect(screen.getByRole("button", { name: "ADD" })).toBeInTheDocument();
  });
});
