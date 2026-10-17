import { test, expect } from "@playwright/test";
const pages = [
  ["/", "League HQ"],
  ["/managers", "Manager Profiles"],
  ["/records", "Record Book"],
  ["/rivalries", "Rivalry Center"],
  ["/luck", "Luck Lab"],
  ["/seasons", "Season Archives"],
  ["/dna", "DraftKings DNA"],
  ["/hall-of-fame", "Fame & Shame"],
];
for (const [route, heading] of pages)
  test(`desktop: ${heading}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      heading,
    );
    await expect(
      page.getByRole("button", { name: "Data status", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Season filter").selectOption("2020");
    await expect(page.getByLabel("Season filter")).toHaveValue("2020");
    await expect(page).toHaveURL(/season=2020/);
    expect(errors).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test("search, keyboard shortcuts, metadata status, and methodology", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByLabel("Search pages and usernames").fill("rival");
  await dialog.getByRole("link", { name: /Rivalry Center/ }).click();
  await expect(page).toHaveURL(/rivalries/);
  await page.getByRole("button", { name: "Data status", exact: true }).click();
  await expect(dialog).toContainText("2019");
  await expect(dialog).toContainText("2025");
  await expect(dialog.getByText("pending", { exact: true })).toHaveCount(7);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Methodology", exact: true }).click();
  await expect(dialog).toContainText(
    "Two zero scores both earn all-play losses.",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(dialog).not.toBeVisible();
});
test("direct season links, archive tabs, and Fame/Shame filters", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".season-tile").filter({ hasText: "2019" }).click();
  await expect(page.getByLabel("Season filter")).toHaveValue("2019");
  await expect(
    page.getByRole("heading", { name: "2019: the official ledger." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Weekly results", exact: true })
    .click();
  await expect(page.getByLabel("Filter week")).toBeVisible();
  await page.goto("/hall-of-fame");
  await page.getByRole("button", { name: "Hall of Shame" }).click();
  await expect(
    page.getByRole("heading", { name: "The no-show register" }),
  ).toBeVisible();
});
test("mobile navigation and responsive layouts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Season Archives" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Season Archives",
  );
  for (const [route] of pages) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("unknown managers and matchups return 404", async ({ page }) => {
  expect((await page.goto("/managers/not-an-imported-manager"))?.status()).toBe(
    404,
  );
  expect((await page.goto("/matchups/not-a-real-matchup"))?.status()).toBe(404);
});

test("qualification thresholds and zero-average controls are explicit", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scoring average", exact: true })
    .click();
  await expect(
    page.getByLabel("Leaderboard minimum participation"),
  ).toHaveValue("14");
  await page.getByLabel("Leaderboard minimum participation").selectOption("28");
  await page.getByRole("checkbox", { name: /Exclude missed weeks/ }).check();
  await expect(
    page.getByRole("checkbox", { name: /Exclude missed weeks/ }),
  ).toBeChecked();
  await page.goto("/managers");
  await expect(page.getByLabel("Manager minimum participation")).toHaveValue(
    "1",
  );
  await page.goto("/luck");
  await expect(page.getByLabel("Luck minimum participation")).toHaveValue("1");
});
