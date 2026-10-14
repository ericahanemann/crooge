import { API_V1_PREFIX } from "../../http/api-prefix.ts";

export const ACCESS_TOKEN_EXPIRES_IN = "15m";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
// Scoped to /api/v1/sessions* so the cookie is never sent on unrelated requests.
export const REFRESH_TOKEN_COOKIE_PATH = `${API_V1_PREFIX}/sessions`;

// See `lockout.ts`.
export const MAX_FAILED_AUTH_ATTEMPTS = 5;
export const AUTH_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
