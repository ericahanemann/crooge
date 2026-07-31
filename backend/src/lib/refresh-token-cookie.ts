import type { CookieSerializeOptions } from "@fastify/cookie";
import {
  REFRESH_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_TTL_MS,
} from "./auth-constants.ts";

export const refreshTokenCookieOptions: CookieSerializeOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: REFRESH_TOKEN_COOKIE_PATH,
  maxAge: REFRESH_TOKEN_TTL_MS / 1000,
};
