import type { Page } from "@playwright/test";

// Plain literal, deliberately — see the comment in auth.spec.ts: this only
// ever authenticates against a disposable test backend/database.
export const E2E_PASSWORD = "correct-horse-1!";

/**
 * Signs up a fresh user (unique email per call) and waits for the
 * post-signup redirect to the authenticated home page. Returns the email.
 *
 * On failure, dumps the page's final URL, visible text and any browser
 * console/page errors into stdout before rethrowing. A bare `waitForURL`
 * timeout says only "the URL never changed", which is the same symptom for a
 * rejected signup, a silently-swallowed client error, and a click that never
 * landed on the button at all — and in CI there's no way to attach to the
 * browser and look for yourself.
 */
export async function signUpAndLand(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;

  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.stack ?? err.message);
  });

  await page.goto("/signup");
  await page.getByLabel(/name/i).fill("Erica");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  try {
    await page.waitForURL(/\/(en|pt-BR)\/?$/, { timeout: 20_000 });
  } catch (error) {
    const bodyText = await page
      .evaluate(() => document.body.innerText)
      .catch(() => "<could not read page text>");
    console.error(
      [
        "signUpAndLand: never redirected after clicking submit.",
        `final url: ${page.url()}`,
        "--- browser console ---",
        consoleMessages.length ? consoleMessages.join("\n") : "<none>",
        "--- uncaught page errors ---",
        pageErrors.length ? pageErrors.join("\n") : "<none>",
        "--- visible page text ---",
        bodyText.slice(0, 2000),
        "-------------------------",
      ].join("\n"),
    );
    throw error;
  }

  return email;
}
