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
}

/** Every field optional — a caller sends only what changed. */
export interface UpdateProfileInput {
  name?: string;
  email?: string;
  currentPassword?: string;
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
    currentPassword: string;
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
