import { expect, test } from "@playwright/test";
import { signUpAndLand } from "./helpers";

test("an installment expense creates a locked series where only description/category can be edited", async ({
  page,
}) => {
  await signUpAndLand(page);
  await page.goto("/monthly");

  await page.getByRole("button", { name: "+ ADD EXPENSE" }).click();
  await page.getByRole("button", { name: "INSTALLMENTS" }).click();
  await page.getByLabel("TOTAL AMOUNT").fill("300");
  const installmentsInput = page.getByLabel("INSTALLMENTS");
  await installmentsInput.fill("3");
  await page.getByLabel("NAME").fill("Sofa");
  await page.getByRole("combobox").click();
  await page.getByText("HOUSING").click();
  await page.getByRole("button", { name: "ADD", exact: true }).click();

  await expect(page.getByText("Sofa")).toBeVisible();
  // Only the first instalment is on this month's page — the other two are
  // filed against the next two months, which this view doesn't show. The
  // "1/3" badge is itself the evidence that a 3-part series was created.
  await expect(page.getByText("INST. 1/3")).toBeVisible();

  await page.locator("button:has(svg.lucide-pencil)").first().click();

  await expect(
    page.getByText(/only the name and category can be edited/i),
  ).toBeVisible();
  await expect(page.getByLabel("AMOUNT")).toHaveCount(0);
  await expect(page.getByLabel("DATE")).toHaveCount(0);

  await page.getByLabel("NAME").fill("Sofa (financed)");
  await page.getByRole("button", { name: "SAVE" }).click();

  await expect(page.getByText("Sofa (financed)")).toBeVisible();
});
