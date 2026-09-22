import { expect, test } from "@playwright/test";
import { signUpAndLand } from "./helpers";

test("registering a card, making a purchase, and paying the current bill", async ({
  page,
}) => {
  await signUpAndLand(page);
  await page.goto("/credit-cards/current-bill");

  await expect(page.getByText("NO CARDS YET")).toBeVisible();
  await page.getByRole("button", { name: "+ ADD NEW CARD" }).click();
  await page.getByLabel("CARD NAME").fill("Nubank");
  await page.getByLabel("LIMIT").fill("1000");
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  // The card name renders more than once: the card visual is duplicated for
  // the mobile/desktop breakpoints (only one is shown at a time) and the card
  // selector repeats it, so scope to the first rather than matching them all.
  await expect(
    page.getByText("Nubank").filter({ visible: true }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "ADD TRANSACTION" }).click();
  await page.getByLabel("NAME").fill("Dinner");
  await page.getByRole("textbox", { name: "AMOUNT" }).fill("50");
  await page.getByRole("combobox").click();
  await page.getByText("FOOD").click();
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await expect(page.getByText("Dinner")).toBeVisible();
  await expect(page.getByText("R$50,00").first()).toBeVisible();

  await page.getByRole("button", { name: "ADD TRANSACTION" }).click();
  await page.getByRole("button", { name: "PAYMENT" }).click();
  await page.getByRole("textbox", { name: "AMOUNT" }).fill("50");
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  // used-credit drops back to 0 once the bill is paid
  await expect(page.getByText("R$0,00").first()).toBeVisible();
});
