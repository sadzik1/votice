import { expect, test } from "@playwright/test";

test("owner builds a survey, a respondent answers it, results update live", async ({
  page,
  browser,
}) => {
  // sign up
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E Owner");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/surveys$/);

  // build a survey (autosaves)
  await page.getByRole("button", { name: "New survey" }).first().click();
  await expect(page).toHaveURL(/\/surveys\/[\w-]+$/);
  await page.getByLabel("Survey title").fill("Favourite colour poll");
  await page.getByLabel("Question text").fill("Which colour do you like?");
  await page.getByLabel("Option 1", { exact: true }).fill("Red");
  await page.getByLabel("Option 2", { exact: true }).fill("Blue");
  await expect(page.getByText("All changes saved")).toBeVisible();

  // publish
  await page.getByRole("button", { name: "Publish" }).click();
  const confirmDialog = page.getByRole("dialog", { name: "Publish this survey?" });
  await confirmDialog.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByRole("heading", { name: "Share" })).toBeVisible();
  const publicLink = await page.getByLabel("Public link").inputValue();

  // owner opens results
  await page.getByRole("link", { name: "Results" }).click();
  await expect(page.getByText("Live")).toBeVisible();
  await expect(page.getByLabel("Blue: 0 responses, 0%")).toBeVisible();

  // respondent in a separate context (own cookies)
  const respondentContext = await browser.newContext();
  const respondent = await respondentContext.newPage();
  await respondent.goto(publicLink);
  await respondent.getByRole("button", { name: "Submit answers" }).click();
  await expect(respondent.getByText("This question is required")).toBeVisible();
  await respondent.getByLabel("Blue").check();
  await respondent.getByRole("button", { name: "Submit answers" }).click();
  await expect(respondent.getByText("Thanks for your answers!")).toBeVisible();

  // results update over SSE, no reload
  await expect(page.getByLabel("Blue: 1 response, 100%")).toBeVisible();

  // second attempt from the same browser
  await respondent.goto(publicLink);
  await expect(respondent.getByText("You have already answered this survey")).toBeVisible();
  await respondentContext.close();
});

test("guests are sent to the login page", async ({ page }) => {
  await page.goto("/surveys");
  await expect(page).toHaveURL(/\/login\?next=%2Fsurveys$/);
});
