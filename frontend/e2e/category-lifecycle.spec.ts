import { expect, test } from "@playwright/test";
import { signUpAndLand } from "./helpers";

test("a custom category can be created on the fly, used, then deleted, falling back to Other", async ({
  page,
}) => {
  await signUpAndLand(page);
  await page.goto("/monthly");

  await page.getByRole("button", { name: "+ ADD EXPENSE" }).click();
  await page.getByLabel("NAME").fill("Dog food");
  await page.getByLabel("AMOUNT").fill("40");
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByPlaceholder("Category name").fill("Pet Supplies");
  await page.getByPlaceholder("Category name").press("Enter");

  await expect(page.getByRole("combobox")).toContainText("Pet Supplies");
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await expect(page.getByText("Dog food")).toBeVisible();
  await expect(page.getByText("Pet Supplies")).toBeVisible();

  await page.getByRole("button", { name: "+ ADD EXPENSE" }).click();
  await page.getByRole("combobox").click();
  await page
    .getByRole("option", { name: /pet supplies/i })
    .getByRole("button", { name: /delete category/i })
    .click();

  // Wait for the delete to actually land rather than racing the reload, then
  // let the reload discard the open dialog — dismissing it by hand (Escape,
  // then CANCEL) means clicking a button that's already detaching.
  await expect(page.getByRole("option", { name: /pet supplies/i })).toHaveCount(
    0,
  );

  await page.reload();

  await expect(page.getByText("Dog food")).toBeVisible();
  await expect(page.getByText("OTHER")).toBeVisible();
  await expect(page.getByText("Pet Supplies")).not.toBeVisible();
});
