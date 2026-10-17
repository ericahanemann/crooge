import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { ThemeToggle } from "./theme-toggle";

const mockUpdateProfile = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ updateProfile: mockUpdateProfile }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
  });

  it("persists the new theme through useAuth's updateProfile, not a raw server action, so AuthContext.user stays in sync", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(
      await screen.findByRole("button", { name: /toggle theme/i }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(mockUpdateProfile).toHaveBeenCalledWith({ theme: "dark" });
  });
});
