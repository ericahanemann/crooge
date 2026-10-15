import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Codespaces serves the app through a forwarded *.app.github.dev origin that
// differs from the Host the dev server sees, which Next's Server Actions
// origin check rejects by default ("Invalid Server Actions request").
const codespaceOrigin =
  process.env.CODESPACE_NAME &&
  process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;

// The real production domain(s) this app is served from (e.g.
// "crooge.ericahanemann.com.br") — unset in every local/CI environment,
// where "localhost:3000" below already covers it. Without this, every
// Server Action (every form submit, every mutation in the app) would be
// rejected in production with "Invalid Server Actions request" — Next's
// CSRF origin check only ever allows what's explicitly listed here, and
// it has no way to know the real domain on its own. Comma-separated to
// allow more than one (e.g. a bare domain and a "www." alias).
const productionOrigins = process.env.SERVER_ACTIONS_ALLOWED_ORIGIN
  ? process.env.SERVER_ACTIONS_ALLOWED_ORIGIN.split(",").map((o) => o.trim())
  : [];

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      // "localhost:3000" is unconditional (not just under Codespaces) —
      // Next 16's prefetch/navigation machinery and the Playwright E2E
      // webServer (`next start` on plain `localhost:3000`, no proxy) both
      // arrive with an `Origin: localhost:<port>` header regardless of the
      // browser's real origin, which the CSRF origin check otherwise
      // rejects as "Invalid Server Actions request". Only add the
      // Codespaces/production origins on top when they're actually set.
      allowedOrigins: [
        "localhost:3000",
        ...(codespaceOrigin ? [codespaceOrigin] : []),
        ...productionOrigins,
      ],
    },
  },
};

export default withNextIntl(nextConfig);
