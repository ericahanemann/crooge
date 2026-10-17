import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { LanguageToggle } from "./language-toggle";

const mockUpdateProfile = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({ updateProfile: mockUpdateProfile }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("next-intl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-intl")>()),
  useLocale: () => "en",
}));

describe("LanguageToggle", () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset();
    mockUpdateProfile.mockResolvedValue(undefined);
    mockReplace.mockReset();
  });

  it("persists the new locale through useAuth's updateProfile, not a raw server action, so AuthContext.user stays in sync", async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);

    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByText("PT"));

    expect(mockReplace).toHaveBeenCalledWith("/profile", { locale: "pt-BR" });
    expect(mockUpdateProfile).toHaveBeenCalledWith({ locale: "pt-BR" });
  });
});
