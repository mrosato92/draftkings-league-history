import { test, expect } from "@playwright/test";
import { loadLeague } from "../../lib/data";
const league = loadLeague();
const all = league.seasons.flatMap((s) =>
  s.lineups.map((l) => ({ ...l, year: s.year })),
);
const panel = (page: import("@playwright/test").Page, title: string) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
test("DNA imports verified labels, paginates and sorts across all rows, and filters positions and slots", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dna");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("1,574");
  await expect(
    page.locator(".metric").filter({ hasText: "UNKNOWN FLEX POSITIONS" }),
  ).toContainText("44");
  const players = panel(page, "The usual suspects");
  await expect(players.getByRole("row").nth(1)).toContainText("Derrick Henry");
  await expect(players.getByRole("row").nth(1)).toContainText("128");
  await players.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(players).toContainText("Showing 16–30 of 671");
  await players
    .getByRole("button", { name: "PLAYER LABEL", exact: true })
    .click();
  await expect(players).toContainText("Showing 1–15 of 671");
  await page
    .getByLabel("Filter players", { exact: true })
    .fill("Derrick Henry");
  await expect(players.getByRole("row")).toHaveCount(2);
  await page.getByLabel("Filter players", { exact: true }).fill("");
  await page
    .getByLabel("DNA position", { exact: true })
    .selectOption("Unknown");
  await expect(players.getByRole("row").nth(1)).toContainText("Unknown");
  await page.getByLabel("DNA roster slot", { exact: true }).selectOption("QB");
  await expect(
    players.getByRole("heading", {
      name: "No observed players match these filters.",
    }),
  ).toBeVisible();
  await page
    .getByLabel("DNA roster slot", { exact: true })
    .selectOption("FLEX");
  await expect(
    players.getByRole("heading", {
      name: "No observed players match these filters.",
    }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("season, manager, and week scopes produce exact coverage and unknown position counts", async ({
  page,
}) => {
  await page.goto("/dna?season=2019");
  await expect(page.getByLabel("Season filter", { exact: true })).toHaveValue(
    "2019",
  );
  await page
    .getByLabel("Filter lineup analytics by manager", { exact: true })
    .selectOption("mrosato92");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("14 official scores");
  await page.getByLabel("DNA week", { exact: true }).selectOption("3");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("1 official scores");
  await expect(
    page.locator(".metric").filter({ hasText: "LINEUP COVERAGE" }),
  ).toContainText("100.0%");
  const unresolved = panel(page, "The unresolved position file");
  await expect(unresolved.getByRole("row")).toHaveCount(2);
  await expect(unresolved).toContainText("Rex Burkhead");
  await expect(unresolved).toContainText("Unknown (FLEX)");
  await page.getByLabel("Season filter", { exact: true }).selectOption("2025");
  await page
    .getByLabel("Filter lineup analytics by manager", { exact: true })
    .selectOption("busta1030");
  await page.getByLabel("DNA week", { exact: true }).selectOption("15");
  await page.getByLabel("Season filter", { exact: true }).selectOption("2019");
  await expect(page.getByLabel("DNA week", { exact: true })).toHaveValue("all");
  await expect(
    page.getByLabel("Filter lineup analytics by manager", { exact: true }),
  ).toHaveValue("all");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("205");
});
test("coverage tables show both manager and season denominators", async ({
  page,
}) => {
  await page.goto("/dna");
  const coverage = panel(page, "Coverage, with the denominator");
  await expect(coverage.getByRole("row")).toHaveCount(8);
  const first = coverage.getByRole("row").filter({ hasText: "2019" });
  await expect(first).toContainText("205");
  await expect(first).toContainText("224");
  await expect(first).toContainText("91.5%");
  await page
    .getByLabel("Coverage grouping", { exact: true })
    .selectOption("manager-season");
  await expect(coverage).toContainText("of 112");
  await page
    .getByLabel("Coverage grouping", { exact: true })
    .selectOption("manager");
  await expect(coverage).toContainText("of 26");
  await page
    .getByLabel("Filter lineup analytics by manager", { exact: true })
    .selectOption("mrosato92");
  const expected = all.filter((l) => l.manager === "mrosato92").length;
  await expect(coverage.getByRole("row")).toHaveCount(2);
  await expect(coverage).toContainText(String(expected));
  await expect(coverage).toContainText("103");
});
test("salary and NFL-team analytics remain unavailable, including profile and receipt cells", async ({
  page,
}) => {
  await page.goto("/dna");
  await expect(page.getByText(/Salary utilization: unavailable/)).toBeVisible();
  await expect(
    page.getByText(/QB\/pass-catcher stacking: unavailable/),
  ).toBeVisible();
  await page.goto("/managers/mrosato92");
  const picks = panel(page, "Observed player selections");
  await expect(
    picks.getByRole("cell", { name: "Unavailable", exact: true }).first(),
  ).toBeVisible();
  await expect(picks).not.toContainText("$0");
});
test("manager comparisons use paired observed weeks and exact label intersections", async ({
  page,
}) => {
  await page.goto("/dna");
  await page
    .getByLabel("DNA comparison first manager", { exact: true })
    .selectOption("mrosato92");
  await page
    .getByLabel("DNA comparison second manager", { exact: true })
    .selectOption("smallery");
  const expected = all
    .filter((l) => l.manager === "mrosato92")
    .flatMap((l) => {
      const other = all.find(
        (b) =>
          b.manager === "smallery" && b.year === l.year && b.week === l.week,
      );
      if (!other) return [];
      const names = new Set(other.selections.map((p) => p.name));
      return [
        {
          year: l.year,
          week: l.week,
          shared: l.selections.filter((p) => names.has(p.name)).length,
        },
      ];
    })
    .sort((a, b) => b.year - a.year || b.week - a.week);
  await expect(
    page.locator(".metric").filter({ hasText: "PAIRED LINEUP WEEKS" }),
  ).toContainText(String(expected.length));
  const overlap = panel(page, "The lineup overlap receipts");
  const row = overlap.getByRole("row").nth(1);
  await expect(row.getByRole("cell").nth(0)).toHaveText(
    String(expected[0].year),
  );
  await expect(row.getByRole("cell").nth(1)).toHaveText(
    String(expected[0].week),
  );
  await expect(row.getByRole("cell").nth(2)).toHaveText(
    String(expected[0].shared),
  );
  await page
    .getByLabel("Compare player labels", { exact: true })
    .fill("Derrick Henry");
  const favorites = panel(page, "Whose favorite is whose?");
  await expect(favorites.getByRole("row")).toHaveCount(2);
  const a = all
    .filter((l) => l.manager === "mrosato92")
    .filter((l) => l.selections.some((p) => p.name === "Derrick Henry")).length;
  await expect(
    favorites.getByRole("row").nth(1).getByRole("cell").nth(1),
  ).toHaveText(String(a));
});
test("unresolved selections link to source receipts with unknown positions and unchanged official scores", async ({
  page,
}) => {
  await page.goto("/dna?season=2019");
  await expect(page.getByLabel("Season filter", { exact: true })).toHaveValue(
    "2019",
  );
  await page
    .getByLabel("Filter lineup analytics by manager", { exact: true })
    .selectOption("mrosato92");
  await expect(
    page.locator(".metric").filter({ hasText: "VERIFIED LINEUPS" }),
  ).toContainText("14 official scores");
  await page.getByLabel("DNA week", { exact: true }).selectOption("3");
  await panel(page, "The unresolved position file")
    .getByRole("link", { name: /Source selections/ })
    .click();
  const m = league.seasons[0].matchups.find(
    (m) =>
      m.week === 3 && [m.home.manager, m.away.manager].includes("mrosato92"),
  )!;
  await expect(page).toHaveURL(new RegExp(m.id));
  const row = page
    .locator(".lineup-grid")
    .getByRole("row")
    .filter({ hasText: "Rex Burkhead" });
  await expect(row).toContainText("Unknown");
  await expect(row).toContainText("Unavailable");
  const official = m.home.manager === "mrosato92" ? m.home.score : m.away.score;
  await expect(page.locator(".matchup-score")).toContainText(
    official.toFixed(2),
  );
});
test("missing nonzero-scoring lineups remain unavailable and never erase official scores", async ({
  page,
}) => {
  const source = league.seasons.flatMap((s) =>
    s.matchups.flatMap((m) =>
      [m.home, m.away]
        .filter(
          (r) =>
            r.score !== 0 &&
            !s.lineups.some(
              (l) => l.week === m.week && l.manager === r.manager,
            ),
        )
        .map((r) => ({ id: m.id, manager: r.manager, score: r.score })),
    ),
  )[0];
  await page.goto(`/matchups/${source.id}`);
  const detail = page.locator(".lineup-grid > div").filter({
    has: page.getByRole("heading", {
      name: `${source.manager} · selections`,
      exact: true,
    }),
  });
  await expect(
    detail.getByRole("heading", {
      name: "Score retained. Selections unavailable.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".matchup-score")).toContainText(
    source.score.toFixed(2),
  );
});
