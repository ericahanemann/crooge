"use server";

import { getLocale } from "next-intl/server";
import {
  ApiError,
  type AuthUser,
  type ColorTheme,
  deleteAccount,
  getMe,
  googleSignIn,
  type Locale,
  linkGoogleAccount,
  refreshSession as refreshBackendSession,
  type SignupCategory,
  signIn,
  signOut,
  signUp,
  type Theme,
  type UpdateProfileInput,
  updateMe,
  updatePassword,
} from "./auth-api";
import {
  clearSessionCookies,
  getAccessToken,
  getPreferenceCookies,
  getRefreshToken,
  setPreferenceCookies,
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
    // Server wins: the account's stored theme/color-theme override whatever
    // this browser's cookies said before sign-in (e.g. a borrowed device
    // showing its own defaults).
    await setPreferenceCookies({
      theme: user.theme,
      colorTheme: user.colorTheme,
    });
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
    // Same reconciliation as `signInAction` — this runs on every silent
    // refresh too (every 10min, see `AuthProvider`), so a preference
    // changed on another device shows up here without a fresh sign-in.
    await setPreferenceCookies({
      theme: user.theme,
      colorTheme: user.colorTheme,
    });
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

/**
 * Partial profile/preference update. Used both by the profile page's forms
 * and, fire-and-forget, by the header toggles (`ThemeToggle`/
 * `ColorThemeToggle`) right after they flip the cookie/DOM attribute
 * themselves — the UI never waits on this network round trip.
 */
export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<{ ok: true; user: AuthUser } | ActionError> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, status: 401, message: "no session" };
  }

  try {
    const user = await updateMe(accessToken, input);
    if (input.theme || input.colorTheme) {
      await setPreferenceCookies({
        theme: user.theme,
        colorTheme: user.colorTheme,
      });
    }
    return { ok: true, user };
  } catch (error) {
    return fromApiError(error);
  }
}

/**
 * Changes the password, then always clears this device's session too —
 * the backend revokes every *other* session family, but the simplest and
 * safest UX is still "re-sign-in after a password change," matching most
 * apps' default.
 */
export async function updatePasswordAction(input: {
  /** Omit only when the account has no password yet (`!AuthUser.hasPassword`). */
  currentPassword?: string;
  newPassword: string;
}): Promise<{ ok: true } | ActionError> {
  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  if (!accessToken) {
    return { ok: false, status: 401, message: "no session" };
  }

  try {
    await updatePassword(accessToken, {
      ...input,
      refreshToken: refreshToken ?? undefined,
    });
    await clearSessionCookies();
    return { ok: true };
  } catch (error) {
    return fromApiError(error);
  }
}

/**
 * Permanently deletes the account, then always clears this device's
 * session — same reasoning as `updatePasswordAction`: there's nothing left
 * to stay signed into.
 */
export async function deleteAccountAction(input: {
  /** Omit only when the account has no password (`!AuthUser.hasPassword`). */
  currentPassword?: string;
}): Promise<{ ok: true } | ActionError> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, status: 401, message: "no session" };
  }

  try {
    await deleteAccount(accessToken, input);
    await clearSessionCookies();
    return { ok: true };
  } catch (error) {
    return fromApiError(error);
  }
}

/**
 * Signs in (or signs up) with Google. On a `409` — an account with this
 * email already has a password — the backend deliberately refuses to
 * auto-link; the caller (`GoogleSignInButton`'s consumers) checks
 * `result.status === 409` and directs the user to sign in with their
 * password instead, then call `linkGoogleAction`.
 */
export async function googleSignInAction(
  idToken: string,
  categories?: SignupCategory[],
): Promise<{ ok: true; user: AuthUser } | ActionError> {
  try {
    const session = await googleSignIn({ idToken, categories });
    let user = await getMe(session.accessToken);
    await setSessionCookies(session.accessToken, session.refreshToken);

    if (session.created) {
      // Brand-new account — carry the visitor's deliberate, seconds-old
      // cookie/locale choices up into it, same direction
      // `AuthProvider.register()` takes for password signup (see its
      // comment) — just done server-side here, since account creation
      // for Google sign-in happens in this one Server Action rather than
      // a separate client effect. Best-effort: a failure here shouldn't
      // surface as a sign-in failure.
      const [cookiePrefs, locale] = await Promise.all([
        getPreferenceCookies(),
        getLocale(),
      ]);
      user = await updateMe(session.accessToken, {
        locale: locale as Locale,
        ...(cookiePrefs.theme ? { theme: cookiePrefs.theme as Theme } : {}),
        ...(cookiePrefs.colorTheme
          ? { colorTheme: cookiePrefs.colorTheme as ColorTheme }
          : {}),
      }).catch(() => user);
    }

    // "Server wins" otherwise — an existing account's stored value
    // overrides whatever this browser's cookies said, same rule
    // `signInAction` applies.
    await setPreferenceCookies({
      theme: user.theme,
      colorTheme: user.colorTheme,
    });
    return { ok: true, user };
  } catch (error) {
    return fromApiError(error);
  }
}

/** Links a Google account to the already-signed-in caller — the completion step after a `googleSignInAction` 409. */
export async function linkGoogleAction(
  idToken: string,
): Promise<{ ok: true; user: AuthUser } | ActionError> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, status: 401, message: "no session" };
  }

  try {
    const user = await linkGoogleAccount(accessToken, idToken);
    return { ok: true, user };
  } catch (error) {
    return fromApiError(error);
  }
}
