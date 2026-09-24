import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("renders the title, subtitle, and both actions", () => {
    render(<ErrorPage error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByText("SOMETHING WENT WRONG")).toBeInTheDocument();
    expect(
      screen.getByText(
        "An unexpected error occurred. You can try again or go back home.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "TRY AGAIN" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GO HOME" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("calls reset when 'Try again' is clicked", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "TRY AGAIN" }));

    expect(reset).toHaveBeenCalled();
  });
});
