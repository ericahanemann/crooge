import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { app } from "../../../src/app.ts";
import {
  MAX_FAILED_AUTH_ATTEMPTS,
  REFRESH_TOKEN_COOKIE_NAME,
} from "../../../src/modules/auth/constants.ts";
import type { GoogleProfile } from "../../../src/modules/auth/google-token.ts";
import {
  InvalidGoogleTokenError,
  verifyGoogleIdToken,
} from "../../../src/modules/auth/google-token.ts";
import {
  generateRefreshToken,
  hashToken,
} from "../../../src/modules/auth/tokens.ts";
import {
  createTestCategory,
  createTestCreditCardWithBill,
  createTestRecurringSeries,
  createTestTransaction,
  createTestUser,
  TEST_USER_PASSWORD,
} from "../../setup/factories.ts";
import { prisma, resetDatabase } from "../../setup/test-db.ts";

// The one deliberate mock in this suite — `verifyGoogleIdToken` is a real
// network call to Google, not app logic, so it's the one place faking the
// result is more honest than exercising it for real (see
// `tests/setup/testcontainers-db.ts`'s comment on `GOOGLE_CLIENT_ID`).
// Everything downstream of it (account lookup/creation/linking, category
// seeding, session issuance) still runs for real against the test database.
vi.mock("../../../src/modules/auth/google-token.ts", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../src/modules/auth/google-token.ts")
    >();
  return { ...actual, verifyGoogleIdToken: vi.fn() };
});

// Plain literals, deliberately — see the comment on TEST_USER_PASSWORD in
// factories.ts for why these are safe despite GitGuardian flagging them.
const PASSWORD_MISSING_NUMBER = "abcdefg!";
const PASSWORD_MISSING_SYMBOL = "abcdefg1";
const PASSWORD_TOO_SHORT = "ab1!";
const WRONG_PASSWORD = "wrong-password!1";

describe("auth routes", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  describe("POST /users", () => {
    it("creates a user and returns 201 with an empty body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(201);

      const user = await prisma.user.findUnique({
        where: { email: "erica@example.com" },
      });
      expect(user).not.toBeNull();
      expect(user?.name).toBe("Erica");
    });

    it("seeds any starter categories sent along with signup", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
          categories: [
            { kind: "expense", label: "Groceries", icon: "shopping-cart" },
          ],
        },
      });

      expect(response.statusCode).toBe(201);

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: "erica@example.com" },
      });
      const categories = await prisma.category.findMany({
        where: { userId: user.id },
      });
      expect(categories).toHaveLength(1);
      expect(categories[0]).toMatchObject({
        kind: "EXPENSE",
        label: "Groceries",
        icon: "shopping-cart",
      });
    });

    it("rejects a duplicate email with 409", async () => {
      await createTestUser({ email: "erica@example.com" });

      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({
        message: "e-mail already in use",
      });
    });

    it("rejects a password missing a number with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: PASSWORD_MISSING_NUMBER,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().issues.password).toContain(
        "must contain at least one number",
      );
    });

    it("rejects a password missing a symbol with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: PASSWORD_MISSING_SYMBOL,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().issues.password).toContain(
        "must contain at least one symbol",
      );
    });

    it("rejects a password below the minimum length with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: {
          name: "Erica",
          email: "erica@example.com",
          password: PASSWORD_TOO_SHORT,
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().issues.password.length).toBeGreaterThan(0);
    });
  });

  describe("POST /sessions", () => {
    it("signs in with correct credentials and sets the refresh cookie", async () => {
      await createTestUser({ email: "erica@example.com" });

      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: {
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));

      const cookie = response.cookies.find(
        (c) => c.name === REFRESH_TOKEN_COOKIE_NAME,
      );
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe(body.refreshToken);
      expect(cookie?.path).toBe("/sessions");
    });

    it("rejects the wrong password with 401", async () => {
      await createTestUser({ email: "erica@example.com" });

      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: "erica@example.com", password: WRONG_PASSWORD },
      });

      expect(response.statusCode).toBe(401);
    });

    it("rejects an unknown email with 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: {
          email: "nobody@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("locks out after too many failed attempts, rejecting even the correct password with 429", async () => {
      await createTestUser({ email: "erica@example.com" });

      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/sessions",
          payload: { email: "erica@example.com", password: WRONG_PASSWORD },
        });
        expect(response.statusCode).toBe(401);
      }

      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: {
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(429);
    });

    it("locks out an unknown email the same way — no account-existence oracle", async () => {
      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS; i++) {
        const response = await app.inject({
          method: "POST",
          url: "/sessions",
          payload: { email: "nobody@example.com", password: WRONG_PASSWORD },
        });
        expect(response.statusCode).toBe(401);
      }

      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: "nobody@example.com", password: WRONG_PASSWORD },
      });

      expect(response.statusCode).toBe(429);
    });

    it("clears the failed-attempt count after a successful sign-in", async () => {
      await createTestUser({ email: "erica@example.com" });

      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS - 1; i++) {
        await app.inject({
          method: "POST",
          url: "/sessions",
          payload: { email: "erica@example.com", password: WRONG_PASSWORD },
        });
      }

      const success = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: {
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });
      expect(success.statusCode).toBe(200);

      const afterReset = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: "erica@example.com", password: WRONG_PASSWORD },
      });
      expect(afterReset.statusCode).toBe(401);

      const attempt = await prisma.authAttempt.findUnique({
        where: { key: "erica@example.com" },
      });
      expect(attempt?.failedCount).toBe(1);
    });

    it("unlocks once the lockout window has passed", async () => {
      await createTestUser({ email: "erica@example.com" });

      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS; i++) {
        await app.inject({
          method: "POST",
          url: "/sessions",
          payload: { email: "erica@example.com", password: WRONG_PASSWORD },
        });
      }

      await prisma.authAttempt.update({
        where: { key: "erica@example.com" },
        data: { lockedUntil: new Date(Date.now() - 1000) },
      });

      const response = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: {
          email: "erica@example.com",
          password: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /me", () => {
    it("rejects requests with no Authorization header with 401", async () => {
      const response = await app.inject({ method: "GET", url: "/me" });
      expect(response.statusCode).toBe(401);
    });

    it("rejects a malformed token with 401", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: "Bearer not-a-real-jwt" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns the authenticated user's profile", async () => {
      const user = await createTestUser({
        name: "Erica",
        email: "erica@example.com",
      });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        id: user.id,
        name: "Erica",
        email: "erica@example.com",
      });
    });

    it("returns 404 when the token's subject no longer maps to a real user", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });
      await prisma.user.delete({ where: { id: user.id } });

      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns default preferences for a freshly created user", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        locale: "en",
        theme: "dark",
        colorTheme: "pink",
        currency: "BRL",
        savingsRate: 0,
        hasPassword: true,
        hasGoogleAccount: false,
      });
    });

    it("reports hasPassword: false and hasGoogleAccount: true for a Google-only account", async () => {
      const user = await prisma.user.create({
        data: {
          name: "Google User",
          email: "google-only@example.com",
          googleId: "google-sub-456",
        },
      });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "GET",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        hasPassword: false,
        hasGoogleAccount: true,
      });
    });
  });

  describe("PATCH /me", () => {
    it("rejects requests with no Authorization header with 401", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        payload: { name: "New Name" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("updates the name alone, no password required", async () => {
      const user = await createTestUser({ name: "Old Name" });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "New Name" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ name: "New Name" });
    });

    it("updates preference fields independently of identity fields", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          locale: "pt-BR",
          theme: "light",
          colorTheme: "violet",
          currency: "USD",
          savingsRate: 20,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        locale: "pt-BR",
        theme: "light",
        colorTheme: "violet",
        currency: "USD",
        savingsRate: 20,
      });
    });

    it("rejects an empty body with 400", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects an invalid colorTheme with 400", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { colorTheme: "chartreuse" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects an email change with no currentPassword with 422 when the account has a password", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { email: "new@example.com" },
      });

      expect(response.statusCode).toBe(422);
      expect(response.json()).toMatchObject({
        message: "currentPassword is required to change email",
      });
    });

    it("allows an email change with no currentPassword on a password-less (Google-only) account", async () => {
      const user = await prisma.user.create({
        data: {
          name: "Google User",
          email: "google-user@example.com",
          googleId: "google-sub-123",
        },
      });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { email: "new@example.com" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ email: "new@example.com" });
    });

    it("rejects an email change with the wrong currentPassword with 401", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email: "new@example.com",
          currentPassword: WRONG_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("changes the email with the correct currentPassword", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email: "new@example.com",
          currentPassword: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ email: "new@example.com" });
    });

    it("rejects an email already in use by another user with 409", async () => {
      await createTestUser({ email: "taken@example.com" });
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email: "taken@example.com",
          currentPassword: TEST_USER_PASSWORD,
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("PATCH /me/password", () => {
    it("rejects requests with no Authorization header with 401", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        payload: {
          currentPassword: TEST_USER_PASSWORD,
          newPassword: "new-password-1!",
        },
      });
      expect(response.statusCode).toBe(401);
    });

    it("rejects the wrong currentPassword with 401", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: WRONG_PASSWORD,
          newPassword: "new-password-1!",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("locks out after too many wrong currentPassword attempts, rejecting even the correct one with 429", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS; i++) {
        const response = await app.inject({
          method: "PATCH",
          url: "/me/password",
          headers: { authorization: `Bearer ${token}` },
          payload: {
            currentPassword: WRONG_PASSWORD,
            newPassword: "new-password-1!",
          },
        });
        expect(response.statusCode).toBe(401);
      }

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: TEST_USER_PASSWORD,
          newPassword: "new-password-1!",
        },
      });

      expect(response.statusCode).toBe(429);
    });

    it("rejects a weak newPassword with 400", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: TEST_USER_PASSWORD,
          newPassword: PASSWORD_MISSING_NUMBER,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("changes the password — old password no longer signs in, new one does", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });
      const newPassword = "new-password-1!";

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: TEST_USER_PASSWORD, newPassword },
      });
      expect(response.statusCode).toBe(204);

      const oldLogin = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      expect(oldLogin.statusCode).toBe(401);

      const newLogin = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: newPassword },
      });
      expect(newLogin.statusCode).toBe(200);
    });

    it("revokes every other session family but keeps the caller's own", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      // Two independent sign-ins: two separate refresh-token families.
      const sessionA = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const sessionB = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const refreshTokenA = sessionA.json().refreshToken;
      const refreshTokenB = sessionB.json().refreshToken;

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: TEST_USER_PASSWORD,
          newPassword: "new-password-1!",
          refreshToken: refreshTokenA,
        },
      });
      expect(response.statusCode).toBe(204);

      // Family A (the caller's own) still refreshes fine.
      const refreshA = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: refreshTokenA },
      });
      expect(refreshA.statusCode).toBe(200);

      // Family B was revoked.
      const refreshB = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: refreshTokenB },
      });
      expect(refreshB.statusCode).toBe(401);
    });

    it("revokes every session, including the caller's own, when no refreshToken is given", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const session = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const refreshToken = session.json().refreshToken;

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          currentPassword: TEST_USER_PASSWORD,
          newPassword: "new-password-1!",
        },
      });
      expect(response.statusCode).toBe(204);

      const refresh = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken },
      });
      expect(refresh.statusCode).toBe(401);
    });

    it("sets a first password on a password-less account with no currentPassword", async () => {
      const user = await prisma.user.create({
        data: {
          name: "Google User",
          email: "google-user@example.com",
          googleId: "google-sub-789",
        },
      });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "PATCH",
        url: "/me/password",
        headers: { authorization: `Bearer ${token}` },
        payload: { newPassword: "new-password-1!" },
      });
      expect(response.statusCode).toBe(204);

      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: "new-password-1!" },
      });
      expect(login.statusCode).toBe(200);
    });
  });

  describe("POST /sessions/google", () => {
    const fakeGoogleProfile = (overrides: Partial<GoogleProfile> = {}) => ({
      googleId: "google-sub-1",
      email: "erica@example.com",
      emailVerified: true,
      name: "Erica",
      ...overrides,
    });

    beforeEach(() => {
      vi.mocked(verifyGoogleIdToken).mockReset();
    });

    it("rejects an invalid/unverifiable token with 401", async () => {
      vi.mocked(verifyGoogleIdToken).mockRejectedValue(
        new InvalidGoogleTokenError("bad token"),
      );

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "not-a-real-token" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("rejects an unverified email with 401", async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(
        fakeGoogleProfile({ emailVerified: false }),
      );

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("creates a new password-less account on first sign-in and seeds starter categories", async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(fakeGoogleProfile());

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: {
          idToken: "some-token",
          categories: [
            { kind: "expense", label: "Groceries", icon: "shopping-cart" },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.refreshToken).toEqual(expect.any(String));
      expect(body.created).toBe(true);

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: "erica@example.com" },
      });
      expect(user.password).toBeNull();
      expect(user.googleId).toBe("google-sub-1");

      const categories = await prisma.category.findMany({
        where: { userId: user.id },
      });
      expect(categories).toHaveLength(1);
      expect(categories[0]).toMatchObject({ label: "Groceries" });
    });

    it("signs into the existing account on a second sign-in, matched by googleId", async () => {
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(fakeGoogleProfile());
      await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "some-token" },
      });
      const firstUser = await prisma.user.findUniqueOrThrow({
        where: { email: "erica@example.com" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().created).toBe(false);
      const userCount = await prisma.user.count();
      expect(userCount).toBe(1);
      const token = app.jwt.verify<{ sub: string }>(
        response.json().accessToken,
      );
      expect(token.sub).toBe(firstUser.id);
    });

    it("auto-links to an existing password-less account matched by email", async () => {
      const existing = await prisma.user.create({
        data: { name: "Erica", email: "erica@example.com", googleId: null },
      });
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(fakeGoogleProfile());

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().created).toBe(false);
      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: existing.id },
      });
      expect(updated.googleId).toBe("google-sub-1");
    });

    it("refuses to auto-link to an existing account that has a password, with 409", async () => {
      await createTestUser({ email: "erica@example.com" });
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(fakeGoogleProfile());

      const response = await app.inject({
        method: "POST",
        url: "/sessions/google",
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(409);
      const unchanged = await prisma.user.findUniqueOrThrow({
        where: { email: "erica@example.com" },
      });
      expect(unchanged.googleId).toBeNull();
    });
  });

  describe("POST /me/google", () => {
    const fakeGoogleProfile = (overrides: Partial<GoogleProfile> = {}) => ({
      googleId: "google-sub-1",
      email: "erica@example.com",
      emailVerified: true,
      name: "Erica",
      ...overrides,
    });

    beforeEach(() => {
      vi.mocked(verifyGoogleIdToken).mockReset();
    });

    it("rejects requests with no Authorization header with 401", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/me/google",
        payload: { idToken: "some-token" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("links Google to the authenticated account when emails match", async () => {
      const user = await createTestUser({ email: "erica@example.com" });
      const token = app.jwt.sign({ sub: user.id });
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(fakeGoogleProfile());

      const response = await app.inject({
        method: "POST",
        url: "/me/google",
        headers: { authorization: `Bearer ${token}` },
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ hasGoogleAccount: true });
    });

    it("rejects a Google account whose email doesn't match the caller's, with 400", async () => {
      const user = await createTestUser({ email: "erica@example.com" });
      const token = app.jwt.sign({ sub: user.id });
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(
        fakeGoogleProfile({ email: "someone-else@example.com" }),
      );

      const response = await app.inject({
        method: "POST",
        url: "/me/google",
        headers: { authorization: `Bearer ${token}` },
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects a Google account already linked to a different user, with 409", async () => {
      await prisma.user.create({
        data: {
          name: "Other",
          email: "other@example.com",
          googleId: "google-sub-1",
        },
      });
      const user = await createTestUser({ email: "erica@example.com" });
      const token = app.jwt.sign({ sub: user.id });
      vi.mocked(verifyGoogleIdToken).mockResolvedValue(
        fakeGoogleProfile({ email: "erica@example.com" }),
      );

      const response = await app.inject({
        method: "POST",
        url: "/me/google",
        headers: { authorization: `Bearer ${token}` },
        payload: { idToken: "some-token" },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("POST /sessions/refresh", () => {
    it("rotates the token when presented via the refresh cookie", async () => {
      const user = await createTestUser();
      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const { refreshToken } = login.json();

      const response = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        cookies: { [REFRESH_TOKEN_COOKIE_NAME]: refreshToken },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    it("rotates the token when presented via the JSON body", async () => {
      const user = await createTestUser();
      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const { refreshToken } = login.json();

      const response = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it("rejects a request with no refresh token at all", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: {},
      });
      expect(response.statusCode).toBe(401);
    });

    it("rejects an unknown refresh token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: "not-a-real-token" },
      });
      expect(response.statusCode).toBe(401);
    });

    it("rejects an expired refresh token", async () => {
      const user = await createTestUser();
      const rawToken = generateRefreshToken();
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          familyId: crypto.randomUUID(),
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: rawToken },
      });

      expect(response.statusCode).toBe(401);
    });

    it("revokes the whole session family on reuse of an already-consumed token", async () => {
      const user = await createTestUser();
      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const tokenA = login.json().refreshToken;

      const firstRefresh = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: tokenA },
      });
      expect(firstRefresh.statusCode).toBe(200);
      const tokenB = firstRefresh.json().refreshToken;

      // Reusing the already-consumed token A is treated as theft.
      const reuseAttempt = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: tokenA },
      });
      expect(reuseAttempt.statusCode).toBe(401);

      // The whole family — including the still-otherwise-valid token B — is
      // now revoked too, not just the reused token.
      const tokenBAfterTheft = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken: tokenB },
      });
      expect(tokenBAfterTheft.statusCode).toBe(401);
    });
  });

  describe("DELETE /sessions", () => {
    it("returns 204 even with no token presented", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/sessions",
        payload: {},
      });
      expect(response.statusCode).toBe(204);
    });

    it("revokes the presented refresh token and clears the cookie", async () => {
      const user = await createTestUser();
      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      const { refreshToken } = login.json();

      const response = await app.inject({
        method: "DELETE",
        url: "/sessions",
        payload: { refreshToken },
      });
      expect(response.statusCode).toBe(204);

      const clearedCookie = response.cookies.find(
        (c) => c.name === REFRESH_TOKEN_COOKIE_NAME,
      );
      expect(clearedCookie?.value).toBe("");

      const refreshAfterLogout = await app.inject({
        method: "POST",
        url: "/sessions/refresh",
        payload: { refreshToken },
      });
      expect(refreshAfterLogout.statusCode).toBe(401);
    });
  });

  describe("DELETE /me", () => {
    it("rejects requests with no Authorization header with 401", async () => {
      const response = await app.inject({ method: "DELETE", url: "/me" });
      expect(response.statusCode).toBe(401);
    });

    it("rejects the wrong currentPassword with 401 and leaves the account intact", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "DELETE",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: WRONG_PASSWORD },
      });

      expect(response.statusCode).toBe(401);
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).not.toBeNull();
    });

    it("rejects a missing currentPassword on an account that has one with 401", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "DELETE",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    });

    it("locks out after too many wrong currentPassword attempts, rejecting even the correct one with 429", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      for (let i = 0; i < MAX_FAILED_AUTH_ATTEMPTS; i++) {
        const response = await app.inject({
          method: "DELETE",
          url: "/me",
          headers: { authorization: `Bearer ${token}` },
          payload: { currentPassword: WRONG_PASSWORD },
        });
        expect(response.statusCode).toBe(401);
      }

      const response = await app.inject({
        method: "DELETE",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: TEST_USER_PASSWORD },
      });

      expect(response.statusCode).toBe(429);
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).not.toBeNull();
    });

    it("deletes a Google-only account with no currentPassword at all", async () => {
      const user = await prisma.user.create({
        data: {
          name: "Google Only",
          email: `google-only-${crypto.randomUUID()}@example.test`,
          googleId: crypto.randomUUID(),
        },
      });
      const token = app.jwt.sign({ sub: user.id });

      const response = await app.inject({
        method: "DELETE",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: {},
      });

      expect(response.statusCode).toBe(204);
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).toBeNull();
    });

    it("deletes the account and every row it owned — transactions, bills, cards, categories, recurring series, refresh tokens", async () => {
      const user = await createTestUser();
      const token = app.jwt.sign({ sub: user.id });

      const category = await createTestCategory(user.id);
      const { card, bill } = await createTestCreditCardWithBill(user.id);
      const transaction = await createTestTransaction(user.id, {
        creditCardId: card.id,
      });
      const { series } = await createTestRecurringSeries(user.id);
      const login = await app.inject({
        method: "POST",
        url: "/sessions",
        payload: { email: user.email, password: TEST_USER_PASSWORD },
      });
      expect(login.statusCode).toBe(200);

      const response = await app.inject({
        method: "DELETE",
        url: "/me",
        headers: { authorization: `Bearer ${token}` },
        payload: { currentPassword: TEST_USER_PASSWORD },
      });

      expect(response.statusCode).toBe(204);
      expect(
        await prisma.user.findUnique({ where: { id: user.id } }),
      ).toBeNull();
      expect(
        await prisma.transaction.findUnique({ where: { id: transaction.id } }),
      ).toBeNull();
      expect(
        await prisma.creditCardBill.findUnique({ where: { id: bill.id } }),
      ).toBeNull();
      expect(
        await prisma.creditCard.findUnique({ where: { id: card.id } }),
      ).toBeNull();
      expect(
        await prisma.category.findUnique({ where: { id: category.id } }),
      ).toBeNull();
      expect(
        await prisma.recurringSeries.findUnique({ where: { id: series.id } }),
      ).toBeNull();
      expect(
        await prisma.refreshToken.findMany({ where: { userId: user.id } }),
      ).toHaveLength(0);
    });
  });
});
