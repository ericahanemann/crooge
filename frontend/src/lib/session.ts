import { cookies } from "next/headers";

// mirrors backend/src/lib/auth-constants.ts (ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_TTL_MS)
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

/**
 * First-party httpOnly cookies on the Next.js domain, set by Server Actions
 * after a successful sign-in/refresh. Never sent to the Fastify backend as a
 * cookie — Server Components/Actions read them here and forward the value as
 * an `Authorization: Bearer` header instead (see `backend-fetch.ts`). Client
 * JS can't read either cookie, same threat model as the previous in-memory-only
 * token, but readable server-side so Server Components can authenticate.
 */
export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

// Same cookie names/shape `ThemeToggle`/`ColorThemeToggle` already write
// client-side via `document.cookie` (see those components) — kept as
// literals here rather than imported, since those two stay plain client
// components with no shared constants module today.
const THEME_PREFERENCE_COOKIE = "theme";
const COLOR_THEME_PREFERENCE_COOKIE = "color-theme";
const PREFERENCE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/**
 * Write-through cache: the account record (`User.theme`/`colorTheme`) is
 * the source of truth, these cookies are what `app/layout.tsx` actually
 * reads before first paint (so there's no network round trip before a
 * toggle/sign-in visually responds). Called after sign-in/refresh resolve
 * ("server wins" — the account's stored preference overrides whatever this
 * browser's cookies happened to say) and after a toggle click posts its
 * change to `PATCH /me` in the background.
 *
 * Deliberately NOT httpOnly — unlike the auth tokens above, these mirror
 * values the client already reads/writes itself via `document.cookie`.
 */
export async function setPreferenceCookies(input: {
  theme?: string;
  colorTheme?: string;
}) {
  const store = await cookies();
  if (input.theme) {
    store.set(THEME_PREFERENCE_COOKIE, input.theme, {
      path: "/",
      sameSite: "lax",
      maxAge: PREFERENCE_COOKIE_MAX_AGE,
    });
  }
  if (input.colorTheme) {
    store.set(COLOR_THEME_PREFERENCE_COOKIE, input.colorTheme, {
      path: "/",
      sameSite: "lax",
      maxAge: PREFERENCE_COOKIE_MAX_AGE,
    });
  }
}

/**
 * The reverse read, for the one place that needs it server-side:
 * `googleSignInAction`'s "carry the visitor's cookie choice up into a
 * brand-new account" step (see its comment) — everywhere else reads these
 * cookies client-side via `document.cookie` (`readCookie`,
 * `AuthProvider.register()`'s password-signup equivalent), since they're
 * deliberately not httpOnly. The server can still read a non-httpOnly
 * cookie the browser sent, httpOnly only blocks client *JS*.
 */
export async function getPreferenceCookies(): Promise<{
  theme?: string;
  colorTheme?: string;
}> {
  const store = await cookies();
  return {
    theme: store.get(THEME_PREFERENCE_COOKIE)?.value,
    colorTheme: store.get(COLOR_THEME_PREFERENCE_COOKIE)?.value,
  };
}
