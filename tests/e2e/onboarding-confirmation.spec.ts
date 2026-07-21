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

  await page.locator("#onboarding-name").fill("Security Builder");
  await page.locator("#onboarding-contact").fill("builder@example.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.locator('input[name="profile"]').first().check({ force: true });
  await page
    .locator('input[name="solanaLevel"]')
    .first()
    .check({ force: true });
  await page
    .locator('input[name="securityExperience"]')
    .first()
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page
    .locator("#onboarding-mainGoal input")
    .first()
    .check({ force: true });
  await page
    .locator("#onboarding-currentLearningSources input")
    .first()
    .check({ force: true });
  await page
    .locator('input[name="guidedLabUsefulness"]')
    .nth(3)
    .check({ force: true });
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.locator('input[name="betaIntent"]').first().check({ force: true });
  await page
    .locator('input[name="feedbackWillingness"]')
    .first()
    .check({ force: true });
  await page.locator("#onboarding-organizationName").fill("SolBreach");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Review your request" })
  ).toBeVisible();
  expect(submissions).toHaveLength(0);

  await page
    .getByRole("button", { name: "Request Beta Access", exact: true })
    .click();

  await expect.poll(() => submissions.length).toBe(1);
  await expect(
    page.getByRole("heading", { name: "Thanks for helping shape the beta." })
  ).toBeVisible();
});
