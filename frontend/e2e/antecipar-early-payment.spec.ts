import { expect, test } from "@playwright/test";
import { signUpAndLand } from "./helpers";

test("a future bill can be paid early via antecipar, and drops out of the next-statements total", async ({
  page,
}) => {
  await signUpAndLand(page);
  await page.goto("/credit-cards/current-bill");

  // Wait for the empty state before acting: the page is still finishing its
  // auth bootstrap right after signup, and submitting the create-card form
  // into that window loses the request.
  await expect(page.getByText("NO CARDS YET")).toBeVisible();
  await page.getByRole("button", { name: "+ ADD NEW CARD" }).click();
  await page.getByLabel("CARD NAME").fill("Nubank");
  await page.getByLabel("LIMIT").fill("1000");
  await page.getByRole("button", { name: "ADD", exact: true }).click();
  // See credit-card-lifecycle.spec.ts: the card name appears in both
  // breakpoint variants of the card visual plus the selector.
  await expect(
    page.getByText("Nubank").filter({ visible: true }).first(),
  ).toBeVisible();

  // A purchase dated well into the future lands in a "future" billing
  // cycle (closingDay defaults to 1, so any day past the 1st already rolls
  // into next month's cycle even for "today").
  await page.getByRole("button", { name: "ADD TRANSACTION" }).click();
  await page.getByLabel("NAME").fill("Future purchase");
  await page.getByRole("textbox", { name: "AMOUNT" }).fill("80");
  await page.getByLabel("DATE").fill("2026-11-15");
  await page.getByRole("combobox").click();
  await page.getByText("SHOPPING").click();
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await expect(page.getByText("R$80,00").first()).toBeVisible();

  await page.getByRole("button", { name: "ANTICIPATE" }).click();
  await page.getByText(/2026/).click();
  await expect(page.getByRole("textbox", { name: "AMOUNT" })).toHaveValue(
    "80.00",
  );
  await page.getByRole("button", { name: "CONFIRM" }).click();

  await expect(page.getByText("R$0,00").first()).toBeVisible();
});
