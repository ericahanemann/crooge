import * as Sentry from "@sentry/node";
import { env } from "../env/index.ts";

// Imported for its side effect as the very first line of `app.ts`, so this
// runs before any route/plugin registration — `captureException` elsewhere
// is a silent no-op until `init` has run. No-ops entirely when `SENTRY_DSN`
// isn't set (local dev, CI, test), so nothing ever reports outside of a real
// deploy that's been given a DSN.
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Render sets this to the deployed commit — lets Sentry show which
    // deploy first produced an error.
    release: env.RENDER_GIT_COMMIT,
  });
}

export { Sentry };
