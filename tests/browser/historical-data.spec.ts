import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { loadLeague } from "../../lib/data";
const league = loadLeague();
test("production output includes every public manager and matchup route", () => {
  const manifest = JSON.parse(
    readFileSync(".next/prerender-manifest.json", "utf8"),
  );
  const paths = Object.keys(manifest.routes);
  expect(paths.filter((p) => p.startsWith("/managers/"))).toHaveLength(26);
  expect(paths.filter((p) => p.startsWith("/matchups/"))).toHaveLength(824);
  for (const season of league.seasons)
    for (const m of season.matchups)
      expect(paths).toContain(`/matchups/${m.id}`);
});
test("career leaders display real official wins and points and can be re-sorted", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText(/824 official-score matchups imported/),
  ).toBeVisible();
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "The career leaderboard",
      exact: true,
    }),
  });
  await expect(panel.getByRole("row").nth(1)).toContainText("smallery");
  await expect(panel.getByRole("row").nth(1)).toContainText("63");
  await panel
    .getByRole("button", { name: "Total points", exact: true })
    .click();
  await expect(panel.getByRole("row").nth(1)).toContainText("mrosato92");
  await expect(panel.getByRole("row").nth(1)).toContainText("13,889.72");
});
test("real record links show authoritative scores, provenance and unavailable selections", async ({
  page,
}) => {
  await page.goto("/records");
  const ceiling = page.locator("article").filter({
    has: page.getByRole("heading", { name: "The ceiling", exact: true }),
  });
  await expect(ceiling).toContainText("223.06");
  await expect(ceiling).toContainText("ChiefGoonba");
  await ceiling.getByRole("link", { name: /2019 · Week 1/ }).click();
  await expect(page).toHaveURL(/2019-w01-ChiefGoonba-kjrosato/);
  const receipt = page.locator("section").filter({
    has: page.getByRole("heading", { name: "2019 · Week 1", exact: true }),
  });
  await expect(receipt).toContainText("223.06");
  await expect(receipt).toContainText("season_2019");
  const source = league.seasons[0];
  const details = source.lineups.filter(
    (l) => l.week === 1 && ["ChiefGoonba", "kjrosato"].includes(l.manager),
  );
  await expect(
    receipt.getByRole("heading", {
      name: "Score retained. Selections unavailable.",
      exact: true,
    }),
  ).toHaveCount(2 - details.length);
  for (const l of details)
    await expect(receipt).toContainText(l.selections[0].name);
});
test("username periods survive manager routing and source matchup receipts", async ({
  page,
}) => {
  const match = league.seasons[0].matchups.find((m) =>
    m.id.includes("G.Logan319"),
  )!;
  expect((await page.goto(`/matchups/${match.id}`))?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "2019 · Week 1", exact: true }),
  ).toBeVisible();
  expect((await page.goto("/managers/G.Logan319"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "G.Logan319",
  );
});
test("manager profile retains missed-week losses when its scoring denominator changes", async ({
  page,
}) => {
  await page.goto("/managers/3liManning");
  const labels = page.locator(".metric");
  const record = labels.filter({ hasText: "SELECTED-SCOPE RECORD" });
  const before = await record.locator(".metric-value").textContent();
  const avg = labels.filter({ hasText: "AVERAGE SCORE" });
  await expect(avg).toContainText("73 scored weeks in average");
  await page.getByRole("checkbox", { name: /Exclude missed weeks/ }).check();
  await expect(avg).toContainText("70 scored weeks in average");
  await expect(record.locator(".metric-value")).toHaveText(before!);
  await expect(
    page.getByRole("heading", {
      name: "Observed player selections",
      exact: true,
    }),
  ).toBeVisible();
});
test("expected-win leaders and rivalry histories populate from the actual score sample", async ({
  page,
}) => {
  await page.goto("/leaderboards");
  await page
    .getByLabel("Leaderboard metric", { exact: true })
    .selectOption("expected");
  const first = page.getByRole("row").nth(1);
  await expect(first).toContainText("mrosato92");
  await expect(first).toContainText("61.33");
  await page.goto("/rivalries");
  await page
    .getByLabel("First manager", { exact: true })
    .selectOption("mrosato92");
  await page
    .getByLabel("Second manager", { exact: true })
    .selectOption("smallery");
  const expected = league.seasons.reduce(
    (n, s) =>
      n +
      s.matchups.filter(
        (m) =>
          new Set([m.home.manager, m.away.manager]).has("mrosato92") &&
          new Set([m.home.manager, m.away.manager]).has("smallery"),
      ).length,
    0,
  );
  const history = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "The head-to-head receipts",
      exact: true,
    }),
  });
  await expect(history.getByRole("row")).toHaveCount(expected + 1);
});
test("DNA reports verified selection coverage while retaining all official scores", async ({
  page,
}) => {
  await page.goto("/dna");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("1,574");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("1648 official scores");
  await expect(
    page.locator(".metric").filter({ hasText: "LINEUP COVERAGE" }),
  ).toContainText("95.5%");
});
