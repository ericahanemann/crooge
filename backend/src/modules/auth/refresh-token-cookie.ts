import type { CookieSerializeOptions } from "@fastify/cookie";
import {
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "./constants.ts";

/**
 * For clients that call this API directly from a browser (not the current
 * frontend, which runs its own httpOnly-cookie session on the Next.js
 * domain and calls this API server-to-server, using the JSON response body
 * instead — see `frontend/src/lib/session.ts`). `sameSite: "none"` is
 * required since the API and any browser-based caller are on different
 * origins.
 */
export const refreshTokenCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: REFRESH_TOKEN_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_MS / 1000,
};
