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
      // Codespaces forwarding origin on top when actually running there.
      allowedOrigins: codespaceOrigin
        ? [codespaceOrigin, "localhost:3000"]
        : ["localhost:3000"],
    },
  },
};

export default withNextIntl(nextConfig);
