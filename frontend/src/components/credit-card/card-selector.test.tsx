import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { CardSelector } from "./card-selector";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => "/credit-cards/current-bill",
}));

const cards = [
  { id: "card-1", name: "Nubank" },
  { id: "card-2", name: "Inter" },
];

describe("CardSelector", () => {
  it("renders the currently selected card's name", () => {
    render(<CardSelector cards={cards} selectedCard="card-1" />);

    expect(screen.getByText("Nubank")).toBeInTheDocument();
  });

  it("pushes ?card=<id> when a different card is selected", async () => {
    const user = userEvent.setup();
    render(<CardSelector cards={cards} selectedCard="card-1" />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Inter" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/credit-cards/current-bill?card=card-2",
      { scroll: false },
    );
  });

  it("preserves ?month= when provided", async () => {
    const user = userEvent.setup();
    render(
      <CardSelector
        cards={cards}
        selectedCard="card-1"
        selectedMonth="2026-03"
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Inter" }));

    expect(mockPush).toHaveBeenCalledWith(
      "/credit-cards/current-bill?card=card-2&month=2026-03",
      { scroll: false },
    );
  });
});
