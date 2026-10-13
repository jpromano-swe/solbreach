import { expect, test } from "@playwright/test";

test("requires an explicit confirmation before submitting onboarding", async ({
  page,
}) => {
  const submissions: unknown[] = [];

  await page.route("**/api/v1/onboarding/responses", async (route) => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({
      body: JSON.stringify({
        data: {
          createdAt: "2026-07-21T00:00:00Z",
          id: "onboarding-test",
          status: "new",
        },
      }),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "EN", exact: true }).click();

  await page.locator('input[name="profile"]').first().check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-realExperience input")
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator('input[name="securityLearningAttempt"]')
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-learningActions input")
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-learningBlockers input")
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-hardestPracticeStep")
    .fill("Turning a report into a reproducible exploit was the hardest part.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-preferredFormats input")
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-practiceSignals input")
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator('input[name="problemIntensity"]')
    .nth(3)
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.locator('input[name="betaIntent"]').first().check({ force: true });
  await page.locator("#onboarding-contact").fill("builder@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Review your responses" })
  ).toBeVisible();
  expect(submissions).toHaveLength(0);

  await page
    .getByRole("button", { name: "Send responses", exact: true })
    .click();

  await expect.poll(() => submissions.length).toBe(1);
  expect(submissions[0]).toMatchObject({
    betaIntent: "try_this_week",
    contact: "builder@example.com",
    guidedLabUsefulness: 4,
  });
  expect(submissions[0]).toMatchObject({
    additionalNotes: expect.stringContaining(
      "Turning a report into a reproducible exploit"
    ),
    futureLabsInterest: expect.stringContaining("blockers=no_clear_path"),
  });
  await expect(
    page.getByRole("heading", { name: "Thank you for helping us." })
  ).toBeVisible();
});
