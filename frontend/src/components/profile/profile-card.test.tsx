import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/lib/auth-api";
import { render } from "../../../tests/setup/test-utils";
import { ProfileCard } from "./profile-card";

const mockUpdateProfile = vi.fn();
const mockChangePassword = vi.fn();
const mockLinkGoogleAccount = vi.fn();
const mockPush = vi.fn();

let currentUser: Partial<AuthUser> | null = null;

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: currentUser,
    updateProfile: mockUpdateProfile,
    changePassword: mockChangePassword,
    linkGoogleAccount: mockLinkGoogleAccount,
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

// See the matching comment in auth-signin-form.test.tsx — real GIS needs a
// live `window.google` this environment doesn't have.
vi.mock("@/components/auth/google-sign-in-button", () => ({
  GoogleSignInButton: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("fake-id-token")}>
      Connect Google
    </button>
  ),
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

describe("ProfileCard", () => {
  beforeEach(() => {
    mockUpdateProfile.mockReset();
    mockChangePassword.mockReset();
    mockLinkGoogleAccount.mockReset();
    mockPush.mockReset();
  });

  describe("with a password set", () => {
    beforeEach(() => {
      currentUser = passwordUser;
    });

    it("shows CHANGE PASSWORD and reveals currentPassword once a new password is typed", async () => {
      render(<ProfileCard />);
      const user = userEvent.setup();

      expect(screen.getByText("CHANGE PASSWORD")).toBeInTheDocument();
      expect(
        screen.queryByLabelText(/current password/i),
      ).not.toBeInTheDocument();

      await user.type(
        screen.getByLabelText(/^new password$/i),
        "new-password-1!",
      );

      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    it("sends currentPassword when changing the password", async () => {
      mockChangePassword.mockResolvedValue(undefined);
      render(<ProfileCard />);
      const user = userEvent.setup();

      await user.type(
        screen.getByLabelText(/^new password$/i),
        "new-password-1!",
      );
      await user.type(
        screen.getByLabelText(/confirm new password/i),
        "new-password-1!",
      );
      await user.type(
        screen.getByLabelText(/current password/i),
        "old-password-1!",
      );
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(mockChangePassword).toHaveBeenCalledWith(
        "old-password-1!",
        "new-password-1!",
      );
    });
  });

  describe("without a password (Google-only account)", () => {
    beforeEach(() => {
      currentUser = googleOnlyUser;
    });

    it("shows SET PASSWORD and never reveals a currentPassword field", async () => {
      render(<ProfileCard />);
      const user = userEvent.setup();

      expect(screen.getByText("SET PASSWORD")).toBeInTheDocument();

      await user.type(
        screen.getByLabelText(/^new password$/i),
        "new-password-1!",
      );

      expect(
        screen.queryByLabelText(/current password/i),
      ).not.toBeInTheDocument();
    });

    it("sets a password with currentPassword undefined", async () => {
      mockChangePassword.mockResolvedValue(undefined);
      render(<ProfileCard />);
      const user = userEvent.setup();

      await user.type(
        screen.getByLabelText(/^new password$/i),
        "new-password-1!",
      );
      await user.type(
        screen.getByLabelText(/confirm new password/i),
        "new-password-1!",
      );
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(mockChangePassword).toHaveBeenCalledWith(
        undefined,
        "new-password-1!",
      );
    });

    it("changes email with no currentPassword", async () => {
      mockUpdateProfile.mockResolvedValue(undefined);
      render(<ProfileCard />);
      const user = userEvent.setup();

      const emailInput = screen.getByLabelText(/^email$/i);
      await user.clear(emailInput);
      await user.type(emailInput, "new@example.com");
      await user.click(screen.getByRole("button", { name: /^save$/i }));

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        email: "new@example.com",
      });
    });

    it("shows a 'Connect Google' button rather than a connected status", () => {
      currentUser = { ...googleOnlyUser, hasGoogleAccount: false };
      render(<ProfileCard />);

      expect(
        screen.getByRole("button", { name: /connect google/i }),
      ).toBeInTheDocument();
    });

    it("shows a connected status instead of the button once linked", () => {
      render(<ProfileCard />);

      expect(
        screen.queryByRole("button", { name: /connect google/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });
  });
});
