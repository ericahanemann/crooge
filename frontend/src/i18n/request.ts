import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// per-request next-intl config: loads the message bundle for the active
// locale on the server. falls back to `defaultLocale` if the resolved locale
// isn't one we support (defensive — proxy.ts should already guarantee this).
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = routing.locales.includes(
    requested as (typeof routing.locales)[number],
  )
    ? (requested as string)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
