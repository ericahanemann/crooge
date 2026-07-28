import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// next.js renamed `middleware.ts` to `proxy.ts` in this version — this file
// runs on every request (except the excluded paths below) and resolves the
// locale prefix (`/en/...`, `/pt-BR/...`) before the route renders.

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
