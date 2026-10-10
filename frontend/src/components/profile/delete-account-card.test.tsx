import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/lib/auth-api";
import { ApiError } from "@/lib/auth-api";
import { render } from "../../../tests/setup/test-utils";
import { DeleteAccountCard } from "./delete-account-card";

const mockDeleteAccount = vi.fn();
const mockPush = vi.fn();

let currentUser: Partial<AuthUser> | null = null;

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: currentUser,
    deleteAccount: mockDeleteAccount,
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

const passwordUser: AuthUser = {
  id: "user-1",
  name: "Erica",
  email: "erica@example.com",
  locale: "en",
  theme: "dark",
  colorTheme: "pink",
  currency: "BRL",
  savingsRate: 0,
  avatarUrl: null,
  hasPassword: true,
  hasGoogleAccount: false,
};

const googleOnlyUser: AuthUser = {
  ...passwordUser,
  hasPassword: false,
  hasGoogleAccount: true,
};

function openDialog(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole("button", { name: "DELETE ACCOUNT" }));
}

function confirmButton() {
  return within(screen.getByRole("dialog")).getByRole("button", {
    name: "DELETE ACCOUNT",
  });
}

describe("DeleteAccountCard", () => {
  beforeEach(() => {
    mockDeleteAccount.mockReset();
    mockPush.mockReset();
  });

  describe("with a password set", () => {
    beforeEach(() => {
      currentUser = passwordUser;
    });

    it("shows a current-password field in the confirm dialog", async () => {
      const user = userEvent.setup();
      render(<DeleteAccountCard />);

      await openDialog(user);

      expect(screen.getByLabelText("CURRENT PASSWORD")).toBeInTheDocument();
    });

    it("deletes on confirm, passing the typed password, and redirects", async () => {
      mockDeleteAccount.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<DeleteAccountCard />);

      await openDialog(user);
      await user.type(screen.getByLabelText("CURRENT PASSWORD"), "hunter2");
      await user.click(confirmButton());

      expect(mockDeleteAccount).toHaveBeenCalledWith("hunter2");
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });

    it("shows the incorrect-password message and doesn't redirect on a 401", async () => {
      mockDeleteAccount.mockRejectedValue(new ApiError(401, "unauthorized"));
      const user = userEvent.setup();
      render(<DeleteAccountCard />);

      await openDialog(user);
      await user.type(screen.getByLabelText("CURRENT PASSWORD"), "wrong");
      await user.click(confirmButton());

      expect(
        await screen.findByText("Incorrect password."),
      ).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Google-only account", () => {
    beforeEach(() => {
      currentUser = googleOnlyUser;
    });

    it("has no current-password field and deletes with no password at all", async () => {
      mockDeleteAccount.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<DeleteAccountCard />);

      await openDialog(user);

      expect(
        screen.queryByLabelText("CURRENT PASSWORD"),
      ).not.toBeInTheDocument();

      await user.click(confirmButton());

      expect(mockDeleteAccount).toHaveBeenCalledWith(undefined);
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });
  });
});
