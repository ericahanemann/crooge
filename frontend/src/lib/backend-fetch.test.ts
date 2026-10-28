import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "../../tests/setup/msw-server";
import { BackendError, backendFetchJson } from "./backend-fetch";

const API_URL = "http://localhost:3333/api/v1";

const mockGetAccessToken = vi.fn();
const mockRedirect = vi.fn((..._args: unknown[]) => {
  throw new Error("REDIRECT");
});

vi.mock("@/lib/session", () => ({
  getAccessToken: () => mockGetAccessToken(),
}));

vi.mock("@/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("next-intl/server", () => ({
  getLocale: () => Promise.resolve("en"),
}));

describe("backendFetchJson", () => {
  beforeEach(() => {
    mockGetAccessToken.mockReset();
    mockRedirect.mockClear();
  });

  it("resolves parsed JSON on a 2xx response", async () => {
    mockGetAccessToken.mockResolvedValue("token-123");
    server.use(
      http.get(`${API_URL}/categories`, () =>
        HttpResponse.json([{ id: "c1" }]),
      ),
    );

    await expect(backendFetchJson("/categories")).resolves.toEqual([
      { id: "c1" },
    ]);
  });

  it("throws a BackendError with status/message/issues on a non-2xx, non-401 response", async () => {
    mockGetAccessToken.mockResolvedValue("token-123");
    server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json(
          {
            message: "validation error",
            issues: { amount: ["must be positive"] },
          },
          { status: 422 },
        ),
      ),
    );

    const promise = backendFetchJson("/transactions", { method: "POST" });

    await expect(promise).rejects.toBeInstanceOf(BackendError);
    await expect(promise).rejects.toMatchObject({
      status: 422,
      message: "validation error",
      issues: { amount: ["must be positive"] },
    });
  });

  it("redirects to /signin without issuing a request when there's no access token", async () => {
    mockGetAccessToken.mockResolvedValue(null);

    await expect(backendFetchJson("/categories")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith({
      href: "/signin",
      locale: "en",
    });
  });

  it("redirects to /signin when the backend responds 401", async () => {
    mockGetAccessToken.mockResolvedValue("stale-token");
    server.use(
      http.get(
        `${API_URL}/categories`,
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(backendFetchJson("/categories")).rejects.toThrow("REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith({
      href: "/signin",
      locale: "en",
    });
  });

  it("logs a 5xx with the backend's requestId, so the failure can be found in Sentry", async () => {
    mockGetAccessToken.mockResolvedValue("token-123");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    server.use(
      http.post(`${API_URL}/transactions`, () =>
        HttpResponse.json(
          { message: "internal server error", requestId: "req-abc" },
          { status: 500 },
        ),
      ),
    );

    await expect(
      backendFetchJson("/transactions", { method: "POST" }),
    ).rejects.toMatchObject({ status: 500, message: "internal server error" });
    expect(consoleError).toHaveBeenCalledWith(
      "backend POST /transactions failed with 500 (Sentry: requestId:req-abc)",
    );
    consoleError.mockRestore();
  });
});
