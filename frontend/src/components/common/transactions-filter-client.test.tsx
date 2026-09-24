import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCategoriesAction } from "@/lib/category-actions";
import {
  deleteTransactionAction,
  updateTransactionAction,
} from "@/lib/transaction-actions";
import { render } from "../../../tests/setup/test-utils";
import type { ResolvedTransactionGroup } from "./transactions-filter-client";
import { TransactionsFilterClient } from "./transactions-filter-client";

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
  deleteTransactionAction: vi.fn(),
  updateTransactionAction: vi.fn(),
}));

const groups: ResolvedTransactionGroup[] = [
  {
    date: "2026-03-05",
    formattedDate: "MARCH 5",
    items: [
      {
        id: "t1",
        date: "2026-03-05",
        category: "cat-food",
        categoryLabel: "Food",
        categoryIcon: "utensils",
        description: "Groceries",
        amount: 50,
        formattedAmount: "R$50,00",
        isIncome: false,
        timing: "oneTime",
        paymentMethod: "debit_pix",
        readOnly: false,
      },
      {
        id: "t2",
        date: "2026-03-05",
        category: "cat-travel",
        categoryLabel: "Travel",
        categoryIcon: "plane",
        description: "Flight",
        amount: 500,
        formattedAmount: "R$500,00",
        isIncome: false,
        timing: "installment",
        paymentMethod: "credit",
        creditCardId: "card-1",
        readOnly: false,
      },
    ],
  },
  {
    date: "2026-03-10",
    formattedDate: "MARCH 10",
    items: [
      {
        id: "t3",
        date: "2026-03-10",
        category: "cat-bill",
        categoryLabel: "Credit Card Bill",
        categoryIcon: "banknote",
        description: "Card bill",
        amount: 200,
        formattedAmount: "R$200,00",
        isIncome: false,
        timing: "oneTime",
        readOnly: true,
      },
    ],
  },
];

const categories = [
  { key: "cat-food", label: "Food" },
  { key: "cat-travel", label: "Travel" },
  { key: "cat-bill", label: "Credit Card Bill" },
];

const defaultProps = {
  categories,
  title: "TRANSACTIONS",
  searchPlaceholder: "Search transactions...",
  allCategoriesLabel: "ALL",
  noResultsLabel: "No results",
  emptyLabel: "No transactions yet",
};

function getRow(description: string): HTMLElement {
  const row = screen
    .getByText(description)
    .closest('[class*="hover:bg-muted/50"]');
  if (!(row instanceof HTMLElement)) throw new Error("row not found");
  return row;
}

describe("TransactionsFilterClient", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(listCategoriesAction).mockResolvedValue([]);
    vi.mocked(deleteTransactionAction).mockResolvedValue({ ok: true });
    vi.mocked(updateTransactionAction).mockResolvedValue({ ok: true });
  });

  it("shows the empty state when there are no transactions at all", () => {
    render(<TransactionsFilterClient {...defaultProps} groups={[]} />);

    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("shows the no-results state when a filter matches nothing", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.type(
      screen.getByPlaceholderText("Search transactions..."),
      "nonexistent",
    );

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
  });

  it("filters by description or category label, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.type(
      screen.getByPlaceholderText("Search transactions..."),
      "grocer",
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.queryByText("Flight")).not.toBeInTheDocument();
    expect(screen.queryByText("Card bill")).not.toBeInTheDocument();
  });

  it("drops a date group entirely once every item in it is filtered out", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.type(
      screen.getByPlaceholderText("Search transactions..."),
      "grocer",
    );

    expect(screen.queryByText("MARCH 10")).not.toBeInTheDocument();
  });

  it("filters by category via the select", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Travel" }));

    expect(screen.getByText("Flight")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
  });

  it("hides both edit/delete icons on a readOnly row", () => {
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    const row = getRow("Card bill");
    expect(within(row).queryAllByRole("button")).toHaveLength(0);
  });

  it("shares a single edit dialog instance whose content swaps per row", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.click(within(getRow("Groceries")).getAllByRole("button")[0]);
    expect(await screen.findByLabelText("NAME")).toHaveValue("Groceries");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "CANCEL" }));
    await user.click(within(getRow("Flight")).getAllByRole("button")[0]);

    expect(await screen.findByLabelText("NAME")).toHaveValue("Flight");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("shows the series delete description for a series row, and the one-time description otherwise", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.click(within(getRow("Flight")).getAllByRole("button")[1]);
    expect(
      await screen.findByText(
        /cancels this occurrence and every one after it/i,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CANCEL" }));

    await user.click(within(getRow("Groceries")).getAllByRole("button")[1]);
    expect(
      await screen.findByText(
        "Are you sure you want to delete this transaction? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("deletes on confirm and refreshes", async () => {
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.click(within(getRow("Groceries")).getAllByRole("button")[1]);
    await user.click(screen.getByRole("button", { name: "DELETE" }));

    expect(deleteTransactionAction).toHaveBeenCalledWith("t1");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("keeps the confirm dialog open and shows the message on delete failure", async () => {
    vi.mocked(deleteTransactionAction).mockResolvedValue({
      ok: false,
      message: "can't delete a bill-materialized transaction",
    });
    const user = userEvent.setup();
    render(<TransactionsFilterClient {...defaultProps} groups={groups} />);

    await user.click(within(getRow("Groceries")).getAllByRole("button")[1]);
    await user.click(screen.getByRole("button", { name: "DELETE" }));

    expect(
      await screen.findByText("can't delete a bill-materialized transaction"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "DELETE" })).toBeInTheDocument();
  });
});
