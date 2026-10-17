// Synthetic examples are test-only; historical assertions use the supplied reconciled package.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { loadLeague } from "../lib/data";
import { lineupSchema, type Lineup, type Season } from "../lib/schema";
import {
  coverageRows,
  coverageSummary,
  lineupOverlap,
  lineupStrategies,
  playerOwnership,
  positionalTrends,
  selectionKey,
  unknownSelections,
} from "../lib/dna";
import { dashboardData } from "../lib/dashboard-data";
import { canonical } from "./helpers/canonical";
import manifest from "./fixtures/dna-import-manifest.json";
const league = loadLeague();
const source = league.seasons.flatMap((s) =>
  s.lineups.map((l) => ({ ...l, year: s.year })),
);
function sample(manager: string, week: number, names: string[]): Lineup {
  const slots = [
    "QB",
    "RB1",
    "RB2",
    "WR1",
    "WR2",
    "WR3",
    "TE",
    "FLEX",
    "DST",
  ] as const;
  return {
    manager,
    week,
    selections: slots.map((slot, i) => ({
      slot,
      name: names[i],
      position:
        slot === "FLEX"
          ? null
          : (slot.replace(/[123]$/, "") as "QB" | "RB" | "WR" | "TE" | "DST"),
    })),
  };
}
function example(): Season {
  return {
    year: 2019,
    status: "partial",
    verification: "unverified",
    regularSeasonWeeks: 14,
    members: ["syntheticA", "syntheticB"],
    matchups: [1, 2].map((week) => ({
      id: `synthetic-${week}`,
      week,
      home: { manager: "syntheticA", score: 100, result: "W" },
      away: { manager: "syntheticB", score: 90, result: "L" },
    })),
    lineups: [
      sample(
        "syntheticA",
        1,
        Array.from({ length: 9 }, (_, i) => `Player ${i}`),
      ),
      sample(
        "syntheticA",
        2,
        Array.from({ length: 9 }, (_, i) => `Player ${i}`),
      ),
      sample("syntheticB", 1, [
        "Player 0",
        "Player 1",
        ...Array.from({ length: 7 }, (_, i) => `Other ${i}`),
      ]),
    ],
  };
}
describe("historical DNA integrity", () => {
  for (const [year, expected] of Object.entries(manifest.byYear))
    it(`${year}: imports exact reconciled selections and retains unknown FLEX positions`, () => {
      const s = league.seasons.find((s) => String(s.year) === year)!;
      const raw = JSON.parse(readFileSync(`data/seasons/${year}.json`, "utf8"));
      expect(
        createHash("sha256").update(canonical(raw.lineups)).digest("hex"),
      ).toBe(expected.lineupsSha256);
      expect(s.lineups).toHaveLength(expected.lineups);
      expect(s.lineups.flatMap((l) => l.selections)).toHaveLength(
        expected.selections,
      );
      expect(unknownSelections([s])).toHaveLength(expected.unknownFlex);
      const coverage = coverageSummary([s]);
      expect(coverage).toMatchObject({
        official: expected.officialScores,
        observed: expected.lineups,
        missing: expected.officialScores - expected.lineups,
      });
      expect(coverage.coverage).toBeCloseTo(
        expected.lineups / expected.officialScores,
        12,
      );
    });
  it("has 1574 lineups, 14166 selections, 74 absences, and 44 unknown positions with no fabricated enrichment", () => {
    expect(coverageSummary(league.seasons)).toMatchObject({
      observed: 1574,
      official: 1648,
      selections: 14166,
      missing: 74,
      unknown: 44,
      missedSubmissions: 12,
    });
    expect(coverageSummary(league.seasons).coverage).toBeCloseTo(
      1574 / 1648,
      12,
    );
    for (const l of source) {
      expect(l.selections).toHaveLength(9);
      expect(
        l.selections.every(
          (p) =>
            p.playerId === undefined &&
            p.salary === undefined &&
            p.team === undefined &&
            p.points === undefined,
        ),
      ).toBe(true);
      expect(
        l.selections
          .filter((p) => p.position === null)
          .every((p) => p.slot === "FLEX"),
      ).toBe(true);
      expect(
        l.selections
          .filter((p) => p.slot === "DST")
          .every((p) => !p.name.endsWith("WR")),
      ).toBe(true);
      expect(l.provenance?.cells[0]).toMatch(/^F[1-9][0-9]*$/);
    }
    const actual = unknownSelections(league.seasons)
      .map((p) => `${p.year}:${p.week}:${p.manager}:${p.name}`)
      .sort();
    expect(actual).toEqual(
      manifest.unknownPositions
        .map((p) => `${p.year}:${p.week}:${p.manager}:${p.name}`)
        .sort(),
    );
    expect(
      manifest.unknownPositions.filter((p) => p.observedPositions.length > 1),
    ).toHaveLength(8);
  });
  it("uses existing canonical usernames and preserves missing nonzero-scoring weeks", () => {
    expect(
      source.some((l) => l.manager === "cmack2023" || l.manager === "dlegz123"),
    ).toBe(false);
    for (const s of league.seasons)
      for (const l of s.lineups) expect(s.members).toContain(l.manager);
    const present = new Set(
      source.map((l) => `${l.year}:${l.week}:${l.manager}`),
    );
    const absent = league.seasons.flatMap((s) =>
      s.matchups.flatMap((m) =>
        [m.home, m.away].filter(
          (r) => !present.has(`${s.year}:${m.week}:${r.manager}`),
        ),
      ),
    );
    expect(absent).toHaveLength(74);
    expect(absent.filter((r) => r.score !== 0)).toHaveLength(62);
  });
  it("matches every manager-season coverage denominator and the entire 671-label frequency table", () => {
    for (const r of coverageRows(league.seasons)) {
      const s = league.seasons.find((s) => s.year === r.year)!;
      const n = source.filter(
        (l) => l.year === r.year && l.manager === r.manager,
      ).length;
      expect(r.observed).toBe(n);
      expect(r.official).toBe(s.regularSeasonWeeks);
      expect(r.coverage).toBeCloseTo(n / s.regularSeasonWeeks!, 12);
    }
    const counts = new Map<
      string,
      { count: number; managers: Map<string, number> }
    >();
    for (const l of source)
      for (const p of l.selections) {
        const r = counts.get(p.name) ?? {
          count: 0,
          managers: new Map<string, number>(),
        };
        r.count++;
        r.managers.set(l.manager, (r.managers.get(l.manager) ?? 0) + 1);
        counts.set(p.name, r);
      }
    const players = playerOwnership(league.seasons);
    expect(players).toHaveLength(671);
    expect(players[0]).toMatchObject({
      name: "Derrick Henry",
      selections: 128,
      salary: null,
      salarySamples: 0,
    });
    expect(players.reduce((n, p) => n + p.selections, 0)).toBe(14166);
    for (const p of players) {
      const expected = counts.get(p.name)!;
      expect(p.selections).toBe(expected.count);
      expect(p.ownership).toBeCloseTo(expected.count / 1574, 12);
      expect(p.repeatPicks).toBe(
        [...expected.managers.values()].reduce((n, count) => n + count - 1, 0),
      );
      expect(p.managers).toBe(expected.managers.size);
    }
    for (const manager of league.managers) {
      const own = source.filter((l) => l.manager === manager.username);
      expect(
        playerOwnership(league.seasons, manager.username).reduce(
          (n, p) => n + p.selections,
          0,
        ),
      ).toBe(own.length * 9);
    }
  });
  it("keeps missing salaries and teams unavailable and includes unknown positions in every FLEX denominator", () => {
    const s = lineupStrategies(league.seasons)!;
    expect(s).toMatchObject({
      count: 1574,
      averageSalary: null,
      stackRate: null,
      salaryLineups: 0,
      teamLineups: 0,
    });
    expect(s.flex.reduce((n, p) => n + p.count, 0)).toBe(1574);
    expect(s.flex.find((p) => p.position === "Unknown")?.count).toBe(44);
    const trends = positionalTrends(league.seasons);
    expect(trends.reduce((n, r) => n + r.count, 0)).toBe(14166);
    expect(
      trends
        .filter((r) => r.position === "Unknown")
        .reduce((n, r) => n + r.count, 0),
    ).toBe(44);
    for (const s of league.seasons)
      expect(
        trends
          .filter((r) => r.year === s.year)
          .reduce((n, r) => n + r.share, 0),
      ).toBeCloseTo(1, 12);
  });
  it("matches independent same-week overlap sets and excludes unpaired lineups", () => {
    for (const [a, b] of [
      ["mrosato92", "smallery"],
      ["Dlegz123", "3liManning"],
      ["G.Logan319", "arkazemi"],
    ]) {
      const actual = lineupOverlap(league.seasons, a, b);
      const expected = source
        .filter((l) => l.manager === a)
        .flatMap((l) => {
          const other = source.find(
            (r) => r.manager === b && r.year === l.year && r.week === l.week,
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
        });
      expect(actual.rows).toHaveLength(expected.length);
      for (const r of actual.rows) {
        const e = expected.find((e) => e.year === r.year && e.week === r.week)!;
        expect(r.shared).toBe(e.shared);
        expect(r.share).toBeCloseTo(e.shared / 9, 12);
        expect(r.jaccard).toBeCloseTo(e.shared / (18 - e.shared), 12);
      }
      expect(actual.averageShared).toBe(
        expected.length
          ? expected.reduce((n, r) => n + r.shared, 0) / expected.length
          : null,
      );
    }
  });
  it("sends only relevant selections to profile and matchup pages while preserving archive totals", () => {
    const hq = dashboardData(league, { section: "" });
    expect(hq.league.seasons.flatMap((s) => s.lineups)).toHaveLength(0);
    expect(
      Object.values(hq.lineupCounts).reduce((n, count) => n + count, 0),
    ).toBe(1574);
    const dna = dashboardData(league, { section: "dna" });
    expect(dna.league.seasons.flatMap((s) => s.lineups)).toHaveLength(1574);
    const profile = dashboardData(league, {
      section: "managers",
      username: "mrosato92",
    });
    expect(
      profile.league.seasons
        .flatMap((s) => s.lineups)
        .every((l) => l.manager === "mrosato92"),
    ).toBe(true);
    const m = league.seasons[0].matchups[0];
    const receipt = dashboardData(league, {
      section: "seasons",
      matchId: m.id,
    });
    expect(
      receipt.league.seasons
        .flatMap((s) => s.lineups)
        .every(
          (l) =>
            l.week === m.week &&
            [m.home.manager, m.away.manager].includes(l.manager),
        ),
    ).toBe(true);
    expect(
      receipt.league.seasons.slice(1).flatMap((s) => s.lineups),
    ).toHaveLength(0);
  });
});
describe("DNA selection-only edge cases", () => {
  it("validates selection-only lineups without generating optional values or guessing unknown positions", () => {
    const l = example().lineups[0];
    expect(lineupSchema.safeParse(l).success).toBe(true);
    const invalid = {
      ...l,
      selections: l.selections.map((p) => ({ ...p, position: null })),
    };
    expect(lineupSchema.safeParse(invalid).success).toBe(false);
    expect(
      lineupSchema.safeParse({
        ...l,
        selections: l.selections.map((p) =>
          p.slot === "FLEX" ? { ...p, position: "QB" } : p,
        ),
      }).success,
    ).toBe(false);
    expect(
      lineupSchema.safeParse({
        ...l,
        selections: l.selections.map((p) => ({ ...p, name: "Duplicate" })),
      }).success,
    ).toBe(false);
    expect(
      lineupSchema.safeParse({
        ...l,
        selections: l.selections.map((p, i) =>
          i === 0 ? { ...p, salary: 50001 } : p,
        ),
      }).success,
    ).toBe(false);
    expect(lineupStrategies([example()])?.averageSalary).toBeNull();
    expect(lineupStrategies([example()])?.stackRate).toBeNull();
  });
  it("counts repeated appearances within managers, preserves name aliases, and filters actual observations", () => {
    const s = example();
    const player = playerOwnership([s]).find((p) => p.name === "Player 0")!;
    expect(player).toMatchObject({
      selections: 3,
      repeatPicks: 1,
      managers: 2,
      ownership: 1,
    });
    expect(
      playerOwnership([s], "syntheticA", { position: "Unknown" })[0],
    ).toMatchObject({ name: "Player 7", selections: 2, ownership: 1 });
    expect(
      playerOwnership([s], "syntheticA", { slot: "RB" }).reduce(
        (n, p) => n + p.selections,
        0,
      ),
    ).toBe(4);
    s.lineups[0].selections[0].name = "Player 0 Sr.";
    expect(
      playerOwnership([s]).filter((p) =>
        ["Player 0", "Player 0 Sr."].includes(p.name),
      ),
    ).toHaveLength(2);
    expect(selectionKey({ name: "Label", slot: "FLEX", position: null })).toBe(
      "name:Label",
    );
  });
  it("ignores slot ordering, handles incomplete pairs, and never divides by absent lineups", () => {
    const s = example();
    const overlap = lineupOverlap([s], "syntheticA", "syntheticB");
    expect(overlap).toMatchObject({ officialWeeks: 2, averageShared: 2 });
    expect(overlap.rows).toHaveLength(1);
    expect(overlap.rows[0]).toMatchObject({
      shared: 2,
      share: 2 / 9,
      jaccard: 2 / 16,
    });
    s.lineups[0].selections.reverse();
    const reordered = lineupOverlap([s], "syntheticA", "syntheticB");
    expect(reordered.rows[0].shared).toBe(overlap.rows[0].shared);
    expect(reordered.rows[0].jaccard).toBe(overlap.rows[0].jaccard);
    expect(
      lineupOverlap([s], "syntheticA", "syntheticA").averageShared,
    ).toBeNull();
    expect(coverageSummary([s], "absent").coverage).toBeNull();
    expect(playerOwnership([{ ...s, lineups: [] }])).toEqual([]);
    expect(lineupStrategies([{ ...s, lineups: [] }])).toBeNull();
    expect(
      lineupOverlap([{ ...s, lineups: [] }], "syntheticA", "syntheticB"),
    ).toMatchObject({
      officialWeeks: 2,
      rows: [],
      averageShared: null,
      averageJaccard: null,
    });
  });
});
