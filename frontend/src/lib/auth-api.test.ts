import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../tests/setup/msw-server";
import { ApiError, getMe, signIn, signUp } from "./auth-api";

const API_URL = "http://localhost:3333";

describe("signUp", () => {
  it("posts to /users and resolves on success", async () => {
    server.use(
      http.post(
        `${API_URL}/users`,
        () => new HttpResponse(null, { status: 201 }),
      ),
    );

    await expect(
      signUp({ name: "Erica", email: "erica@example.com", password: "x" }),
    ).resolves.toBeUndefined();
  });

  it("throws an ApiError with the response's status/message on a 409", async () => {
    server.use(
      http.post(`${API_URL}/users`, () =>
        HttpResponse.json(
          { message: "e-mail already in use" },
          { status: 409 },
        ),
      ),
    );

    await expect(
      signUp({ name: "Erica", email: "erica@example.com", password: "x" }),
    ).rejects.toMatchObject({ status: 409, message: "e-mail already in use" });
  });
});

describe("signIn", () => {
  it("returns the session on success", async () => {
    server.use(
      http.post(`${API_URL}/sessions`, () =>
        HttpResponse.json({ accessToken: "a", refreshToken: "r" }),
      ),
    );

    await expect(
      signIn({ email: "erica@example.com", password: "x" }),
    ).resolves.toEqual({ accessToken: "a", refreshToken: "r" });
  });

  it("throws an ApiError on invalid credentials", async () => {
    server.use(
      http.post(`${API_URL}/sessions`, () =>
        HttpResponse.json({ message: "invalid credentials" }, { status: 401 }),
      ),
    );

    const promise = signIn({ email: "erica@example.com", password: "wrong" });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 401,
      message: "invalid credentials",
    });
  });
});

describe("getMe", () => {
  it("sends the access token as a Bearer header and returns the user", async () => {
    let receivedAuth: string | null = null;
    server.use(
      http.get(`${API_URL}/me`, ({ request }) => {
        receivedAuth = request.headers.get("authorization");
        return HttpResponse.json({
          id: "u1",
          name: "Erica",
          email: "erica@example.com",
        });
      }),
    );

    const user = await getMe("token-123");

    expect(receivedAuth).toBe("Bearer token-123");
    expect(user).toEqual({
      id: "u1",
      name: "Erica",
      email: "erica@example.com",
    });
  });
});
