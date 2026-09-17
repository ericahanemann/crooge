import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/auth-api";
import { render } from "../../../tests/setup/test-utils";
import { AuthSignupForm } from "./auth-signup-form";

const mockRegister = vi.fn();
const mockPush = vi.fn();

vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: mockRegister,
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

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  {
    name = "Erica",
    email = "erica@example.com",
    password = "correct-horse-1!",
  } = {},
) {
  await user.type(screen.getByLabelText(/name/i), name);
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
}

describe("AuthSignupForm", () => {
  beforeEach(() => {
    mockRegister.mockReset();
    mockPush.mockReset();
  });

  it("blocks submission client-side for a password that fails the complexity check", async () => {
    render(<AuthSignupForm />);
    const user = userEvent.setup();

    await fillForm(user, { password: "short" });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(
        /must be at least 8 characters, with a number and a symbol/i,
      ),
    ).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("registers and navigates home on a valid submission", async () => {
    mockRegister.mockResolvedValue(undefined);
    render(<AuthSignupForm />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(mockRegister).toHaveBeenCalledWith(
      "Erica",
      "erica@example.com",
      "correct-horse-1!",
      expect.any(Array),
    );
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows the email-taken message on a 409", async () => {
    mockRegister.mockRejectedValue(new ApiError(409, "e-mail already in use"));
    render(<AuthSignupForm />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/account with this email already exists/i),
    ).toBeInTheDocument();
  });

  it("shows the weak-password message when the server rejects the password", async () => {
    mockRegister.mockRejectedValue(
      new ApiError(400, "validation error", { password: ["too weak"] }),
    );
    render(<AuthSignupForm />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(
        /must be at least 8 characters, with a number and a symbol/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows a generic error message on any other failure", async () => {
    mockRegister.mockRejectedValue(new Error("network down"));
    render(<AuthSignupForm />);
    const user = userEvent.setup();

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });
});
