export const ACCESS_TOKEN_EXPIRES_IN = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
// Scoped to /sessions* so the cookie is never sent on unrelated requests.
export const REFRESH_TOKEN_COOKIE_PATH = "/sessions";
