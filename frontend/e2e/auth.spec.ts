import { expect, test } from "@playwright/test";

// Plain literals, deliberately — these only ever authenticate against a
// disposable test backend/database that doesn't exist outside the test run,
// so there's no real credential here to protect. GitGuardian's PR check
// still flags them (its "Generic Password" detector triggers on the
// password-context shape, not on whether the value is guessable or secret)
// — resolved as a false positive/test credential in the GitGuardian
// dashboard rather than obscured in code.
const VALID_PASSWORD = "correct-horse-1!";
const WRONG_PASSWORD = "wrong-password!1";

test("a user can sign up and reach the authenticated home page", async ({
  page,
}) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;

  await page.goto("/signup");

  await page.getByLabel(/name/i).fill("Erica");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(VALID_PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();

  // Signup is a real round trip (argon2 hash + seeding the starter
  // categories, then an immediate sign-in), so it needs more than the 5s
  // default `expect` timeout.
  await expect(page).toHaveURL(/\/(en|pt-BR)\/?$/, { timeout: 20_000 });
});

test("an invalid sign-in shows an error and keeps the user on the page", async ({
  page,
}) => {
  await page.goto("/signin");

  await page.getByLabel(/email/i).fill(`nobody-${Date.now()}@example.test`);
  await page.getByLabel(/password/i).fill(WRONG_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/signin$/);
});
