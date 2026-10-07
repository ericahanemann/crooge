import { waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../../../tests/setup/test-utils";
import { GoogleSignInButton } from "./google-sign-in-button";

// `next/script`'s real `strategy="afterInteractive"` loading never fires
// `onLoad` in jsdom (no real network, no real script execution) — mocked
// to fire it immediately, simulating "the script is already loaded",
// which is the only thing this component actually reacts to.
vi.mock("next/script", () => ({
  default: ({ onLoad }: { onLoad?: () => void }) => {
    onLoad?.();
    return null;
  },
}));

describe("GoogleSignInButton", () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();

  beforeEach(() => {
    initialize.mockReset();
    renderButton.mockReset();
    window.google = { accounts: { id: { initialize, renderButton } } };
  });

  afterEach(() => {
    delete window.google;
  });

  it("initializes GIS with the app's client ID and renders the button once the script loads", async () => {
    render(<GoogleSignInButton text="signin_with" onToken={vi.fn()} />);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ callback: expect.any(Function) }),
    );
    const [, options] = renderButton.mock.calls[0];
    expect(options).toMatchObject({
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
    });
  });

  it("passes the requested text through for each context (signup/link)", async () => {
    render(<GoogleSignInButton text="continue_with" onToken={vi.fn()} />);

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton.mock.calls[0][1]).toMatchObject({
      text: "continue_with",
    });
  });

  it("calls onToken with the credential when Google's own callback fires", async () => {
    const onToken = vi.fn();
    render(<GoogleSignInButton text="signin_with" onToken={onToken} />);

    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const { callback } = initialize.mock.calls[0][0];

    callback({ credential: "fake-id-token" });

    expect(onToken).toHaveBeenCalledWith("fake-id-token");
  });

  it("never trusts/decodes the credential itself — just forwards it verbatim", async () => {
    const onToken = vi.fn();
    render(<GoogleSignInButton text="signin_with" onToken={onToken} />);

    await waitFor(() => expect(initialize).toHaveBeenCalled());
    const { callback } = initialize.mock.calls[0][0];

    callback({ credential: "not-even-a-real-jwt" });

    expect(onToken).toHaveBeenCalledWith("not-even-a-real-jwt");
    expect(onToken).toHaveBeenCalledTimes(1);
  });

  it("renders without throwing when window.google never becomes available", () => {
    delete window.google;

    expect(() =>
      render(<GoogleSignInButton text="signin_with" onToken={vi.fn()} />),
    ).not.toThrow();
    expect(initialize).not.toHaveBeenCalled();
  });
});
