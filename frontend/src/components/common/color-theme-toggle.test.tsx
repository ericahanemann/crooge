import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { ColorThemeToggle } from "./color-theme-toggle";

const mockUpdateProfile = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ updateProfile: mockUpdateProfile }),
}));

describe("ColorThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-color-theme");
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  it("persists the new color theme through useAuth's updateProfile, not a raw server action, so AuthContext.user stays in sync", async () => {
    const user = userEvent.setup();
    render(<ColorThemeToggle />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("VIOLET"));

    expect(document.documentElement.getAttribute("data-color-theme")).toBe(
      "violet",
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith({ colorTheme: "violet" });
  });
});
