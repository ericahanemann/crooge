"use server";

import {
  ApiError,
  type AuthUser,
  getMe,
  refreshSession as refreshBackendSession,
  type SignupCategory,
  signIn,
  signOut,
  signUp,
} from "./auth-api";
import {
  clearSessionCookies,
  getRefreshToken,
  setSessionCookies,
} from "./session";

type ActionError = { ok: false; status: number; message: string };

function fromApiError(error: unknown): ActionError {
  if (error instanceof ApiError) {
    return { ok: false, status: error.status, message: error.message };
  }
  return { ok: false, status: 500, message: "unexpected error" };
}

export async function signUpAction(
  name: string,
  email: string,
  password: string,
  categories?: SignupCategory[],
): Promise<{ ok: true } | ActionError> {
  try {
    await signUp({ name, email, password, categories });
    return { ok: true };
  } catch (error) {
    return fromApiError(error);
  }
}

export async function signInAction(
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | ActionError> {
  try {
    const session = await signIn({ email, password });
    const user = await getMe(session.accessToken);
    await setSessionCookies(session.accessToken, session.refreshToken);
    return { ok: true, user };
  } catch (error) {
    return fromApiError(error);
  }
}

/** Re-authenticates from the `refresh_token` cookie: used on `AuthProvider` mount and by its periodic silent-refresh timer, so the httpOnly cookies Server Components read stay valid across a long-lived session. */
export async function refreshSessionAction(): Promise<
  { ok: true; user: AuthUser } | ActionError
> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { ok: false, status: 401, message: "no session" };
  }

  try {
    const session = await refreshBackendSession(refreshToken);
    const user = await getMe(session.accessToken);
    await setSessionCookies(session.accessToken, session.refreshToken);
    return { ok: true, user };
  } catch (error) {
    await clearSessionCookies();
    return fromApiError(error);
  }
}

export async function signOutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    await signOut(refreshToken).catch(() => {});
  }
  await clearSessionCookies();
}
