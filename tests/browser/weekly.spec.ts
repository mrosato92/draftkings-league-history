import { test, expect } from "@playwright/test";
test("comparison links redirect with filters and retain all comparison tools", async ({
  page,
}) => {
  await page.goto("/compare?season=2020");
  await expect(page).toHaveURL(/rivalries\?season=2020/);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Comparison Lab" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("First manager")).toBeVisible();
  await page.getByRole("checkbox", { name: /Exclude missed weeks/ }).check();
  await expect(
    page.getByRole("heading", { name: "The head-to-head receipts" }),
  ).toBeVisible();
});
test("weekly victories filter by season and manager and link to recaps", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Weekly Winners", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Weekly Winners",
  );
  await page.getByLabel("Season filter").selectOption("2019");
  await page.getByLabel("Weekly winners manager").selectOption("mrosato92");
  const leaderboard = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Weekly victories leaderboard",
      exact: true,
    }),
  });
  await expect(leaderboard.locator("tbody tr")).toHaveCount(1);
  await expect(leaderboard).toContainText("mrosato92");
  await page
    .getByRole("link", { name: /2019 · Week/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Weekly Recap",
  );
  await expect(page.getByLabel("Season filter")).toHaveValue("2019");
});
test("recaps support direct links, boundaries, week navigation, history and chart focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/weekly-recap?season=2020&week=1");
  await expect(
    page.getByRole("button", { name: "Previous Week", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Opening week: previous rank/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Weekly awards", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next Week", exact: true }).click();
  await expect(page.getByLabel("Recap week")).toHaveValue("2");
  await expect(page).toHaveURL(/week=2/);
  await page.goBack();
  await expect(page.getByLabel("Recap week")).toHaveValue("1");
  await page.getByLabel("Recap week").selectOption("14");
  await expect(
    page.getByRole("button", { name: "Next Week", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Season filter").selectOption("2021");
  await page.getByLabel("Recap week").selectOption("15");
  await expect(
    page.getByRole("button", { name: "Next Week", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Standings chart manager").selectOption({ index: 1 });
  const scoring = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Weekly scoring leaderboard",
      exact: true,
    }),
  });
  await expect(scoring.locator("tbody tr")).toHaveCount(16);
  await scoring.getByRole("button", { name: "SCORE", exact: true }).click();
  await expect(
    scoring.getByRole("columnheader", { name: "SCORE", exact: true }),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator(".weekly-matchups article")).toHaveCount(8);
  await page.getByRole("link", { name: "Matchup receipt ↗" }).first().click();
  await expect(page).toHaveURL(/matchups\//);
  expect(errors).toEqual([]);
});
