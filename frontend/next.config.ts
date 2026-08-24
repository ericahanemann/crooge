import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Codespaces serves the app through a forwarded *.app.github.dev origin that
// differs from the Host the dev server sees, which Next's Server Actions
// origin check rejects by default ("Invalid Server Actions request"). Some
// requests (Next 16 dev's prefetch/navigation machinery) also arrive with an
// `Origin: localhost:<port>` header regardless of the browser's real origin,
// so that needs to be allowed too.
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
      allowedOrigins: codespaceOrigin
        ? [codespaceOrigin, "localhost:3000"]
        : undefined,
    },
  },
};

export default withNextIntl(nextConfig);
