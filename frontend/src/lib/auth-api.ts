const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  status: number;
  issues?: Record<string, string[] | undefined>;

  constructor(
    status: number,
    message: string,
    issues?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function toApiError(response: Response) {
  const body = await response.json().catch(() => null);
  return new ApiError(
    response.status,
    body?.message ?? "request failed",
    body?.issues,
  );
}

export type Locale = "en" | "pt-BR";
export type Theme = "light" | "dark";
export type ColorTheme = "pink" | "violet" | "emerald" | "amber" | "sky";
export type Currency = "BRL" | "USD" | "EUR";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  locale: Locale;
  theme: Theme;
  colorTheme: ColorTheme;
  currency: Currency;
  savingsRate: number;
  /** Set by hand on the profile page, or automatically from Google's own picture on first Google sign-in/link (never overwritten once set). Null → `UserAvatar` falls back to initials. */
  avatarUrl: string | null;
  /** False for a Google-only account that's never set one — `updatePassword` doesn't need `currentPassword` in that case. */
  hasPassword: boolean;
  hasGoogleAccount: boolean;
}

/** Every field optional — a caller sends only what changed. */
export interface UpdateProfileInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  /** Pass `null` to clear it back to the initials fallback. */
  avatarUrl?: string | null;
  locale?: Locale;
  theme?: Theme;
  colorTheme?: ColorTheme;
  currency?: Currency;
  savingsRate?: number;
}

export interface SignupCategory {
  kind: "expense" | "income";
  label: string;
  icon: string;
  isFallback?: boolean;
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  categories?: SignupCategory[];
}): Promise<void> {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);
}

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

/**
 * `refreshToken` is passed explicitly (not read from a browser cookie) —
 * callers are Server Actions holding the token from their own first-party
 * cookie (`session.ts`), not the browser talking to this backend directly.
 */
export async function refreshSession(refreshToken: string): Promise<Session> {
  const response = await fetch(`${API_URL}/sessions/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

export async function signOut(refreshToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok && response.status !== 401) throw await toApiError(response);
}

export async function getMe(accessToken: string): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

/** Partial update to the authenticated user's own profile/preferences — see `UpdateProfileInput`. */
export async function updateMe(
  accessToken: string,
  input: UpdateProfileInput,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

/**
 * `refreshToken` is passed explicitly, same reasoning as `refreshSession`
 * above — it identifies which session family to keep signed in while every
 * other family is revoked. Omit it to sign out everywhere, including the
 * device making this request.
 */
export async function updatePassword(
  accessToken: string,
  input: {
    /** Omit only when the account has no password yet (`!AuthUser.hasPassword`) — setting a first password on a Google-only account. */
    currentPassword?: string;
    newPassword: string;
    refreshToken?: string;
  },
): Promise<void> {
  const response = await fetch(`${API_URL}/me/password`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);
}

export interface GoogleSession extends Session {
  /** Whether this call created a brand-new account — the frontend needs this to decide which way preference-cookie reconciliation goes, same distinction `signUpAction`/`signInAction` make for password auth. */
  created: boolean;
}

/**
 * Signs in with Google — creates a new account on first use, or resolves
 * to an existing one. `idToken` comes straight from Google Identity
 * Services (`GoogleSignInButton`) and is verified server-side; this call
 * never trusts it client-side.
 *
 * A `409` here specifically means "an account with this email already has
 * a password" — the backend refuses to auto-link it (see
 * `backend/src/modules/auth/routes/google-sign-in.ts`'s docstring); the
 * caller should direct the user to sign in with their password instead,
 * then call `linkGoogleAccount`.
 */
export async function googleSignIn(input: {
  idToken: string;
  categories?: SignupCategory[];
}): Promise<GoogleSession> {
  const response = await fetch(`${API_URL}/sessions/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}

/** Links a Google account to the already-authenticated caller — the completion step after a `googleSignIn` 409. */
export async function linkGoogleAccount(
  accessToken: string,
  idToken: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/me/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) throw await toApiError(response);

  return response.json();
}
