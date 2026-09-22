import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCreditCardAction } from "@/lib/credit-card-actions";
import { render } from "../../../tests/setup/test-utils";
import { ArchiveCreditCardButton } from "./archive-credit-card-button";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

vi.mock("@/lib/credit-card-actions", () => ({
  deleteCreditCardAction: vi.fn(),
}));

describe("ArchiveCreditCardButton", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
  });

  it("opens the confirm dialog on click", async () => {
    const user = userEvent.setup();
    render(<ArchiveCreditCardButton cardId="card-1" />);

    await user.click(screen.getByRole("button", { name: "ARCHIVE CARD" }));

    expect(
      screen.getByRole("heading", { name: "ARCHIVE CARD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Archiving hides this card from the card picker/i),
    ).toBeInTheDocument();
  });

  it("archives on confirm and refreshes", async () => {
    vi.mocked(deleteCreditCardAction).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ArchiveCreditCardButton cardId="card-1" />);

    await user.click(screen.getByRole("button", { name: "ARCHIVE CARD" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "ARCHIVE CARD",
      }),
    );

    expect(deleteCreditCardAction).toHaveBeenCalledWith("card-1");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the balance message on a has_balance failure", async () => {
    vi.mocked(deleteCreditCardAction).mockResolvedValue({
      ok: false,
      code: "has_balance",
      message: "can't archive a card with an unpaid balance",
    });
    const user = userEvent.setup();
    render(<ArchiveCreditCardButton cardId="card-1" />);

    await user.click(screen.getByRole("button", { name: "ARCHIVE CARD" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "ARCHIVE CARD",
      }),
    );

    expect(
      await screen.findByText(
        "This card has an unpaid balance on its current bill — pay it off first.",
      ),
    ).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("shows the generic message on any other failure", async () => {
    vi.mocked(deleteCreditCardAction).mockResolvedValue({
      ok: false,
      code: "unknown",
      message: "credit card not found",
    });
    const user = userEvent.setup();
    render(<ArchiveCreditCardButton cardId="card-1" />);

    await user.click(screen.getByRole("button", { name: "ARCHIVE CARD" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "ARCHIVE CARD",
      }),
    );

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });
});
