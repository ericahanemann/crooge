import { app } from "./app.ts";
import { env } from "./env/index.ts";
import { prisma } from "./lib/prisma.ts";
import { Sentry } from "./lib/sentry.ts";

// Render sends SIGTERM on every deploy/restart and SIGKILLs ~30s later.
// `app.close()` stops accepting connections and waits for in-flight
// requests, so a deploy no longer cuts a half-written request off mid-way;
// closing Sentry last flushes anything those requests reported.
async function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down`);
  try {
    await app.close();
    await prisma.$disconnect();
  } catch (error) {
    console.error("error during shutdown", error);
    Sentry.captureException(error);
  } finally {
    await Sentry.close(2000);
    process.exit(0);
  }
}

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => void shutdown(signal));
}

try {
  await app.listen({ host: "0.0.0.0", port: env.PORT });
  console.log(`🚀 HTTP server running on port ${env.PORT}`);
} catch (error) {
  console.error("failed to start HTTP server", error);
  Sentry.captureException(error);
  await Sentry.flush(2000);
  process.exit(1);
}
