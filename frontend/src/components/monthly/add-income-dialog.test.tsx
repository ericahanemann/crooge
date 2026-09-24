import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCategoriesAction } from "@/lib/category-actions";
import { todayISO } from "@/lib/format";
import { createTransactionAction } from "@/lib/transaction-actions";
import { render } from "../../../tests/setup/test-utils";
import { AddIncomeDialog } from "./add-income-dialog";

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

const salaryCategory = {
  id: "cat-salary",
  kind: "income" as const,
  label: "Salary",
  icon: "briefcase",
  isFallback: false,
  isSystem: false,
};

async function openDialog() {
  const user = userEvent.setup();
  render(<AddIncomeDialog />);
  await user.click(screen.getByRole("button", { name: "+ ADD INCOME" }));
  return user;
}

describe("AddIncomeDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(listCategoriesAction).mockResolvedValue([salaryCategory]);
    vi.mocked(createTransactionAction).mockResolvedValue({ ok: true });
  });

  it("fetches income categories on open and lists them in the picker", async () => {
    const user = await openDialog();

    expect(listCategoriesAction).toHaveBeenCalledWith("income");

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Salary")).toBeInTheDocument();
  });

  it("shows required/positive errors and doesn't submit when the form is empty", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findAllByText("Required")).toHaveLength(2); // description + category
    expect(screen.getByText("Must be a positive number")).toBeInTheDocument();
    expect(createTransactionAction).not.toHaveBeenCalled();
  });

  it("rejects a zero or negative amount", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Freelance work");
    await user.type(screen.getByLabelText("AMOUNT"), "0");
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(screen.getByText("Must be a positive number")).toBeInTheDocument();
    expect(createTransactionAction).not.toHaveBeenCalled();
  });

  it("submits the transaction with the expected payload and closes on success", async () => {
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Freelance work");
    await user.type(screen.getByLabelText("AMOUNT"), "500");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Salary"));
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(createTransactionAction).toHaveBeenCalledWith({
      type: "income",
      description: "Freelance work",
      amount: 500,
      date: todayISO(),
      category: "cat-salary",
    });
    expect(mockRefresh).toHaveBeenCalled();

    expect(
      screen.queryByRole("button", { name: "ADD" }),
    ).not.toBeInTheDocument();
  });

  it("keep adding clears description/amount but keeps date/category, and shows an ack", async () => {
    const user = await openDialog();

    await user.click(screen.getByRole("checkbox"));
    await user.type(screen.getByLabelText("NAME"), "Freelance work");
    await user.type(screen.getByLabelText("AMOUNT"), "500");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Salary"));
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findByText("Added")).toBeInTheDocument();
    expect(screen.getByLabelText("NAME")).toHaveValue("");
    expect(screen.getByLabelText("AMOUNT")).toHaveValue("");
    expect(screen.getByLabelText("DATE")).toHaveValue(todayISO());
    // dialog stayed open
    expect(screen.getByRole("button", { name: "ADD" })).toBeInTheDocument();
  });

  it("shows the backend's error message inline and keeps the dialog open on failure", async () => {
    vi.mocked(createTransactionAction).mockResolvedValue({
      ok: false,
      message: "request failed",
    } as never);
    const user = await openDialog();

    await user.type(screen.getByLabelText("NAME"), "Freelance work");
    await user.type(screen.getByLabelText("AMOUNT"), "500");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByText("Salary"));
    await user.click(screen.getByRole("button", { name: "ADD" }));

    expect(await screen.findByText("request failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ADD" })).toBeInTheDocument();
  });
});
