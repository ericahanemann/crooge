import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/auth-api";
import { render } from "../../../tests/setup/test-utils";
import { AuthSigninForm } from "./auth-signin-form";

const mockLogin = vi.fn();
const mockPush = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    login: mockLogin,
    register: vi.fn(),
    logout: vi.fn(),
    status: "unauthenticated",
    user: null,
  }),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  Link: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AuthSigninForm", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockPush.mockReset();
  });

  it("renders labeled email and password fields", () => {
    render(<AuthSigninForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("signs in with the typed credentials and navigates home on success", async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<AuthSigninForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "erica@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-horse-1!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockLogin).toHaveBeenCalledWith(
      "erica@example.com",
      "correct-horse-1!",
    );
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows the invalid-credentials message on a 401", async () => {
    mockLogin.mockRejectedValue(new ApiError(401, "invalid credentials"));
    render(<AuthSigninForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "erica@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
  });

  it("shows a generic error message on any other failure", async () => {
    mockLogin.mockRejectedValue(new Error("network down"));
    render(<AuthSigninForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "erica@example.com");
    await user.type(screen.getByLabelText(/password/i), "whatever1!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });
});
