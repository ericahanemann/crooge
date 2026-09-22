import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { payCreditCardBillAction } from "@/lib/credit-card-actions";
import type { CreditCardBill } from "@/lib/types";
import { render } from "../../../tests/setup/test-utils";
import { AnteciparDialog } from "./antecipar-dialog";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/credit-card-actions", () => ({
  payCreditCardBillAction: vi.fn(),
}));

const futureBills: CreditCardBill[] = [
  {
    month: "2026-04",
    amount: 100,
    status: "future",
    closingDate: "2026-04-10",
    dueDate: "2026-04-20",
  },
  {
    month: "2026-05",
    amount: 200,
    status: "future",
    closingDate: "2026-05-10",
    dueDate: "2026-05-20",
  },
];

async function openDialog() {
  const user = userEvent.setup();
  render(<AnteciparDialog cardId="card-1" futureBills={futureBills} />);
  await user.click(screen.getByRole("button", { name: /anticipate/i }));
  return user;
}

describe("AnteciparDialog", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    vi.mocked(payCreditCardBillAction).mockResolvedValue({ ok: true });
  });

  it("renders a row per future bill with its formatted month and amount", async () => {
    await openDialog();

    expect(screen.getByText("April 2026")).toBeInTheDocument();
    expect(screen.getByText("May 2026")).toBeInTheDocument();
    expect(screen.getByText("R$100,00")).toBeInTheDocument();
    expect(screen.getByText("R$200,00")).toBeInTheDocument();
  });

  it("disables confirm until at least one bill is selected", async () => {
    await openDialog();

    expect(screen.getByRole("button", { name: "CONFIRM" })).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByText("April 2026"));

    expect(screen.getByRole("button", { name: "CONFIRM" })).not.toBeDisabled();
  });

  it("auto-fills the amount to the sum of selected bills, and stays editable afterward", async () => {
    const user = await openDialog();

    await user.click(screen.getByText("April 2026"));
    expect(screen.getByLabelText("AMOUNT")).toHaveValue("100.00");

    await user.click(screen.getByText("May 2026"));
    expect(screen.getByLabelText("AMOUNT")).toHaveValue("300.00");

    const amountInput = screen.getByLabelText("AMOUNT");
    await user.clear(amountInput);
    await user.type(amountInput, "250");
    expect(amountInput).toHaveValue("250");
  });

  it("passes an amount override when exactly one bill is selected", async () => {
    const user = await openDialog();

    await user.click(screen.getByText("April 2026"));
    await user.click(screen.getByRole("button", { name: "CONFIRM" }));

    expect(payCreditCardBillAction).toHaveBeenCalledTimes(1);
    expect(payCreditCardBillAction).toHaveBeenCalledWith(
      "card-1",
      "2026-04",
      100,
    );
  });

  it("pays one bill per selection with no override when multiple are selected", async () => {
    const user = await openDialog();

    await user.click(screen.getByText("April 2026"));
    await user.click(screen.getByText("May 2026"));
    await user.click(screen.getByRole("button", { name: "CONFIRM" }));

    expect(payCreditCardBillAction).toHaveBeenCalledTimes(2);
    expect(payCreditCardBillAction).toHaveBeenCalledWith(
      "card-1",
      "2026-04",
      undefined,
    );
    expect(payCreditCardBillAction).toHaveBeenCalledWith(
      "card-1",
      "2026-05",
      undefined,
    );
  });

  it("shows an error and keeps the dialog open if any call in the batch fails", async () => {
    vi.mocked(payCreditCardBillAction)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: "bill not found" });
    const user = await openDialog();

    await user.click(screen.getByText("April 2026"));
    await user.click(screen.getByText("May 2026"));
    await user.click(screen.getByRole("button", { name: "CONFIRM" }));

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "CONFIRM" })).toBeInTheDocument();
  });

  it("refreshes and resets on success", async () => {
    const user = await openDialog();

    await user.click(screen.getByText("April 2026"));
    await user.click(screen.getByRole("button", { name: "CONFIRM" }));

    expect(mockRefresh).toHaveBeenCalled();
  });
});
