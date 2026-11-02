// Synthetic rule fixtures; never imported by the application.
import { describe, it, expect } from "vitest";
import { outcome } from "../lib/analytics";
import { loadLeague } from "../lib/data";
import type { Season } from "../lib/schema";
import {
  weeklyWinners,
  weeklyVictoryTable,
  weeklyRecords,
  standingsMovement,
  weeklyRecap,
} from "../lib/weekly";
const members = Array.from({ length: 16 }, (_, i) => `test_${i}`);
function fixture(scores: number[][], year = 2019): Season {
  return {
    year,
    members,
    status: "complete",
    verification: "reconciled",
    regularSeasonWeeks: year < 2021 ? 14 : 15,
    lineups: [],
    matchups: scores.flatMap((values, i) =>
      Array.from({ length: 8 }, (_, pair) => ({
        id: `test-${year}-${i + 1}-${pair}`,
        week: i + 1,
        home: {
          manager: members[pair * 2],
          score: values[pair * 2],
          result: outcome(values[pair * 2], values[pair * 2 + 1]),
        },
        away: {
          manager: members[pair * 2 + 1],
          score: values[pair * 2 + 1],
          result: outcome(values[pair * 2 + 1], values[pair * 2]),
        },
      })),
    ),
  };
}
const scores = [
  100, 90, 0, 0, 100, 100, 120, 110, 80, 70, 60, 50, 40, 30, 20, 10,
];
describe("weekly victories", () => {
  it("awards highest of all 16, with runner-up and score gap", () => {
    const s = fixture([scores]);
    const rows = weeklyWinners([s]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      manager: "test_6",
      score: 120,
      margin: 10,
      shared: false,
    });
    expect(rows[0].runners.map((g) => g.manager)).toEqual(["test_7"]);
  });
  it("gives every tied top scorer a full shared win and zero margin", () => {
    const rows = weeklyWinners([fixture([[120, ...scores.slice(1)]])]);
    expect(rows.map((r) => r.manager)).toEqual(["test_0", "test_6"]);
    expect(rows.every((r) => r.shared && r.margin === 0)).toBe(true);
    expect(
      weeklyVictoryTable([fixture([[120, ...scores.slice(1)]])])[0].rate,
    ).toBe(1);
  });
  it("counts zeros in participation, absent seasons never in denominators", () => {
    const s = fixture([scores, scores]);
    const other = fixture([scores], 2020);
    other.members = other.members.map((m) => `other_${m}`);
    other.matchups = other.matchups.map((m) => ({
      ...m,
      home: { ...m.home, manager: `other_${m.home.manager}` },
      away: { ...m.away, manager: `other_${m.away.manager}` },
    }));
    expect(
      weeklyVictoryTable([s, other]).find((r) => r.manager === "test_2"),
    ).toMatchObject({ weeks: 2, victories: 0, rate: 0 });
    expect(
      weeklyVictoryTable([s, other]).find((r) => r.manager === "test_6"),
    ).toMatchObject({
      weeks: 2,
      victories: 2,
      rate: 1,
      years: { 2019: 2, 2020: 0 },
    });
  });
  it("resets streaks across seasons and missing weeks; retains tied record holders", () => {
    const a = fixture([scores, scores]);
    const b = fixture([scores], 2020);
    expect(weeklyRecords([a, b]).streak).toMatchObject([
      { length: 2, year: 2019, start: 1, week: 2 },
    ]);
    a.matchups.filter((m) => m.week === 2).forEach((m) => (m.week = 3));
    expect(weeklyRecords([a, b]).streak.every((r) => r.length === 1)).toBe(
      true,
    );
    expect(weeklyRecords([a, b]).highest).toHaveLength(3);
    expect(weeklyRecords([a, b], "test_0").highest).toEqual([]);
  });
  it("excludes incomplete or unverified seasons and incomplete weeks", () => {
    const s = fixture([scores]);
    expect(weeklyWinners([{ ...s, verification: "unverified" }])).toEqual([]);
    expect(weeklyWinners([{ ...s, status: "partial" }])).toEqual([]);
    expect(weeklyWinners([{ ...s, matchups: s.matchups.slice(1) }])).toEqual(
      [],
    );
  });
});
describe("recaps and standings", () => {
  it("uses no Week 0 standings and ranks by official wins then points", () => {
    const s = fixture([scores]);
    const first = standingsMovement(s, 1);
    expect(first.every((r) => r.previous === null && r.movement === null)).toBe(
      true,
    );
    expect(first[0].manager).toBe("test_6");
    expect(first.find((r) => r.manager === "test_2")).toMatchObject({
      wins: 0,
      losses: 1,
    });
    expect(first.find((r) => r.manager === "test_3")).toMatchObject({
      wins: 0,
      losses: 1,
    });
    expect(first.find((r) => r.manager === "test_2")?.rank).toBe(
      first.find((r) => r.manager === "test_3")?.rank,
    );
  });
  it("computes rank movements against previous cumulative standings", () => {
    const second = [...scores];
    second[0] = 200;
    second[6] = 1;
    const s = fixture([scores, second]);
    const rows = standingsMovement(s, 2);
    const first = standingsMovement(s, 1);
    for (const r of rows)
      expect(r.movement).toBe(
        first.find((p) => p.manager === r.manager)!.rank - r.rank,
      );
    const recap = weeklyRecap(s, 2);
    expect(
      recap.awards.find((a) => a.title === "Biggest Climber")!.winners.length,
    ).toBeGreaterThan(0);
  });
  it("retains tied awards, ranks and actual losing/winning outcomes", () => {
    const s = fixture([scores]);
    const r = weeklyRecap(s, 1);
    expect(r.scoring).toHaveLength(16);
    expect(r.average).toBe(61.25);
    expect(
      r.awards
        .find((a) => a.title === "Ice Cold")!
        .winners.map((g) => g.manager),
    ).toEqual(["test_2", "test_3"]);
    expect(
      r.awards
        .find((a) => a.title === "Brutal Loss")!
        .winners.map((g) => g.manager),
    ).toEqual(["test_7"]);
    expect(
      r.awards
        .find((a) => a.title === "Lucky Bastard")!
        .winners.map((g) => g.manager),
    ).toEqual(["test_14"]);
    expect(
      r.awards.find((a) => a.title === "Biggest Climber")!.winners,
    ).toEqual([]);
    expect(r.scoring.filter((g) => g.score === 100).map((g) => g.rank)).toEqual(
      [3, 3, 3],
    );
    expect(
      r.awards.find((a) => a.title === "Photo Finish")!.winners,
    ).toHaveLength(6);
  });
  it("all-zero weeks have shared scoring honors, double losses and no winning awards", () => {
    const s = fixture([Array(16).fill(0)]);
    const r = weeklyRecap(s, 1);
    expect(r.scoring.every((g) => g.result === "L")).toBe(true);
    expect(weeklyWinners([s])).toHaveLength(16);
    for (const title of ["Public Execution", "Photo Finish", "Lucky Bastard"])
      expect(r.awards.find((a) => a.title === title)!.winners).toEqual([]);
    expect(
      r.awards.find((a) => a.title === "King of the Week")!.winners,
    ).toHaveLength(16);
  });
  it("negative submissions can beat a zero without creating a positive margin award", () => {
    const r = weeklyRecap(fixture([[-1, 0, ...Array(14).fill(0)]]), 1);
    expect(
      r.awards
        .find((a) => a.title === "Lucky Bastard")!
        .winners.map((g) => g.manager),
    ).toEqual(["test_0"]);
    expect(
      r.awards.find((a) => a.title === "Public Execution")!.winners,
    ).toEqual([]);
  });
});
it("independently reconciles all 103 historical weekly leaders and season-end standings", () => {
  const league = loadLeague();
  const winners = weeklyWinners(league.seasons);
  expect(new Set(winners.map((g) => `${g.year}-${g.week}`)).size).toBe(103);
  for (const s of league.seasons) {
    for (let week = 1; week <= s.regularSeasonWeeks!; week++) {
      const actual = s.matchups
        .filter((m) => m.week === week)
        .flatMap((m) => [m.home, m.away]);
      const top = Math.max(...actual.map((r) => r.score));
      expect(
        winners
          .filter((g) => g.year === s.year && g.week === week)
          .map((g) => g.manager)
          .sort(),
      ).toEqual(
        actual
          .filter((r) => r.score === top)
          .map((r) => r.manager)
          .sort(),
      );
    }
    for (const r of standingsMovement(s, s.regularSeasonWeeks!)) {
      const results = s.matchups
        .flatMap((m) => [m.home, m.away])
        .filter((g) => g.manager === r.manager);
      expect(r.wins).toBe(results.filter((g) => g.result === "W").length);
      expect(r.points).toBeCloseTo(results.reduce((n, g) => n + g.score, 0));
    }
  }
});
