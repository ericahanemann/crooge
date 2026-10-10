import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedTransactionGroup } from "@/components/common/transaction-row-list";
import { render } from "../../../tests/setup/test-utils";
import { MonthlyTransactionsFilter } from "./monthly-transactions-filter";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/en/monthly",
  useSearchParams: () => new URLSearchParams("month=2026-03"),
}));

// `TransactionRowList` pulls in `@/lib/transaction-actions`/`category-actions`
// (server actions) for real otherwise, which import `@/i18n/navigation`'s
// `redirect` — pulling in next-intl's navigation submodule for real, which
// this test environment can't resolve. Same mocks
// `transactions-filter-client.test.tsx` already uses for the same reason.
vi.mock("@/lib/category-actions", () => ({
  listCategoriesAction: vi.fn().mockResolvedValue([]),
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
        readOnly: false,
      },
    ],
  },
];

const categories = [{ key: "cat-food", label: "Food" }];

const defaultProps = {
  groups,
  categories,
  total: 1,
  pageSize: 20,
  title: "TRANSACTIONS",
  searchPlaceholder: "Search transactions...",
  allCategoriesLabel: "ALL",
  noResultsLabel: "No results",
  emptyLabel: "No transactions yet",
  loadMoreLabel: "LOAD MORE",
};

describe("MonthlyTransactionsFilter", () => {
  beforeEach(() => {
    mockReplace.mockReset();
  });

  it("debounces the search box before updating the URL", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MonthlyTransactionsFilter {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("Search transactions..."),
      "uber",
    );
    expect(mockReplace).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(mockReplace).toHaveBeenCalledWith(
      "/en/monthly?month=2026-03&q=uber",
      { scroll: false },
    );
    vi.useRealTimers();
  });

  it("updates the category immediately, resetting pageSize", async () => {
    const user = userEvent.setup();
    render(<MonthlyTransactionsFilter {...defaultProps} pageSize={40} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Food" }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/en/monthly?month=2026-03&category=cat-food",
      { scroll: false },
    );
  });

  it("shows the Load more button only once loaded items fall short of the total", () => {
    const { unmount } = render(
      <MonthlyTransactionsFilter {...defaultProps} total={5} />,
    );
    expect(
      screen.getByRole("button", { name: "LOAD MORE" }),
    ).toBeInTheDocument();
    unmount();

    render(<MonthlyTransactionsFilter {...defaultProps} total={1} />);
    expect(
      screen.queryByRole("button", { name: "LOAD MORE" }),
    ).not.toBeInTheDocument();
  });

  it("bumps pageSize by the step when Load more is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MonthlyTransactionsFilter {...defaultProps} total={5} pageSize={20} />,
    );

    await user.click(screen.getByRole("button", { name: "LOAD MORE" }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/en/monthly?month=2026-03&pageSize=40",
      { scroll: false },
    );
  });
});
