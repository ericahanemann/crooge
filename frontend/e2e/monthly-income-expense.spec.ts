import { expect, test } from "@playwright/test";
import { signUpAndLand } from "./helpers";

test("adding a one-time income and a one-time expense updates the monthly summary", async ({
  page,
}) => {
  await signUpAndLand(page);
  await page.goto("/monthly");

  await page.getByRole("button", { name: "+ ADD INCOME" }).click();
  await page.getByLabel("NAME").fill("Freelance work");
  await page.getByLabel("AMOUNT").fill("1000");
  await page.getByRole("combobox").click();
  await page.getByText("SALARY").click();
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  // Assert on the transaction row's signed amount ("+R$…"/"-R$…") rather than
  // the bare figure: the summary cards above the list show the same number
  // unsigned, so a bare "R$1.000,00" matches the balance and the
  // income-this-month totals too.
  await expect(page.getByText("Freelance work")).toBeVisible();
  await expect(page.getByText("+R$1.000,00")).toBeVisible();

  await page.getByRole("button", { name: "+ ADD EXPENSE" }).click();
  await page.getByLabel("NAME").fill("Groceries");
  await page.getByLabel("AMOUNT").fill("150");
  await page.getByRole("combobox").click();
  await page.getByText("FOOD").click();
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await expect(page.getByText("Groceries")).toBeVisible();
  await expect(page.getByText("-R$150,00")).toBeVisible();
  // balance = 1000 - 150
  await expect(page.getByText("R$850,00").first()).toBeVisible();
});
