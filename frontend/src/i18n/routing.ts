import { defineRouting } from "next-intl/routing";

// shared next-intl config consumed by proxy.ts, navigation.ts, and request.ts.
// `pathnames` maps each canonical route (used as the `href` everywhere in the
// app) to its locale-specific URL slug — e.g. linking to "/monthly" resolves
// to "/pt-BR/mensal" for portuguese users. see DESIGN.md "Internationalisation".
export const routing = defineRouting({
  locales: ["en", "pt-BR"],
  defaultLocale: "en",
  localeDetection: true,
  pathnames: {
    "/": "/",
    "/monthly": {
      en: "/monthly",
      "pt-BR": "/mensal",
    },
    "/credit-cards": {
      en: "/credit-cards",
      "pt-BR": "/cartoes",
    },
    "/credit-cards/current-bill": {
      en: "/credit-cards/current-bill",
      "pt-BR": "/cartoes/fatura-atual",
    },
    "/credit-cards/bills-summary": {
      en: "/credit-cards/bills-summary",
      "pt-BR": "/cartoes/resumo",
    },
    "/signin": {
      en: "/signin",
      "pt-BR": "/entrar",
    },
    "/signup": {
      en: "/signup",
      "pt-BR": "/cadastro",
    },
  },
});
