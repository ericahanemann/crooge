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
