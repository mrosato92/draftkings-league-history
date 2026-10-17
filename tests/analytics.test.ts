// SYNTHETIC TEST FIXTURES ONLY. None of these values are imported by the website.
import { describe, expect, it } from "vitest";
import {
  allPlayOutcome,
  completeWeeks,
  qualifiedLeaders,
  games,
  lineupStrategies,
  longestStreak,
  luckTable,
  outcome,
  playerOwnership,
  records,
  rivalry,
  scoringHistory,
  standings,
} from "../lib/analytics";
import {
  leagueSchema,
  lineupSchema,
  seasonSchema,
  YEARS,
  type Season,
  type Lineup,
} from "../lib/schema";
import { loadLeague } from "../lib/data";
const members = Array.from({ length: 16 }, (_, i) => `test_manager_${i}`);
function season(
  scores = [100, 90, 0, 0, 100, 100, 120, 110, 80, 70, 60, 50, 40, 30, 20, 10],
): Season {
  return {
    year: 2019,
    status: "partial",
    verification: "unverified",
    regularSeasonWeeks: 14,
    members,
    matchups: Array.from({ length: 8 }, (_, i) => ({
      id: `2019-w1-${i}`,
      week: 1,
      home: {
        manager: members[i * 2],
        score: scores[i * 2],
        result: outcome(scores[i * 2], scores[i * 2 + 1]),
      },
      away: {
        manager: members[i * 2 + 1],
        score: scores[i * 2 + 1],
        result: outcome(scores[i * 2 + 1], scores[i * 2]),
      },
    })),
    lineups: [],
  };
}
function verifiedSeason(input: Season): Season {
  const result: Season = {
    ...input,
    status: "complete",
    verification: "reconciled",
    matchups: [...input.matchups],
  };
  for (let week = 1; week <= (result.regularSeasonWeeks ?? 0); week++) {
    for (let pair = 0; pair < 8; pair++) {
      if (
        result.matchups.some(
          (m) => m.week === week && m.home.manager === members[pair * 2],
        )
      )
        continue;
      result.matchups.push({
        id: `synthetic-${result.year}-${week}-${pair}`,
        week,
        home: { manager: members[pair * 2], score: 90, result: "T" },
        away: { manager: members[pair * 2 + 1], score: 90, result: "T" },
      });
    }
  }
  return result;
}
function testLineup(): Lineup {
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
    week: 1,
    manager: members[0],
    selections: slots.map((slot, i) => ({
      slot,
      playerId: `test-player-${i}`,
      name: `Synthetic Player ${i}`,
      team: i === 0 || i === 3 ? "AAA" : "BBB",
      position:
        slot === "FLEX"
          ? "RB"
          : (slot.replace(/[123]$/, "") as "QB" | "RB" | "WR" | "TE" | "DST"),
      salary: 5000,
      points: i === 8 ? -2 : 10,
    })),
  };
}
describe("official results", () => {
  it("uses automatic losses for every missed submission, including double zeros", () => {
    expect(outcome(0, 0)).toBe("L");
    expect(outcome(0, 100)).toBe("L");
    expect(outcome(100, 0)).toBe("W");
    expect(outcome(100, 100)).toBe("T");
    expect(outcome(-1, 0)).toBe("W");
  });
  it("ranks by wins and then total points, never by win percentage", () => {
    const rows = standings([season()]);
    expect(rows[0].manager).toBe(members[6]);
    expect(rows[1].manager).toBe(members[0]);
    expect(rows.find((r) => r.manager === members[4])?.rank).toBe(
      rows.find((r) => r.manager === members[5])?.rank,
    );
    expect(rows.find((r) => r.manager === members[2])).toMatchObject({
      wins: 0,
      losses: 1,
      missed: 1,
      average: 0,
    });
    expect(rows.find((r) => r.manager === members[4])).toMatchObject({
      wins: 0,
      losses: 0,
      ties: 1,
      winRate: 0.5,
    });
  });
  it("excludes zeros from averages only, preserving points and official results", () => {
    const s = season();
    s.matchups.push({
      id: "2019-w2",
      week: 2,
      home: { manager: members[0], score: 0, result: "L" },
      away: { manager: members[1], score: 80, result: "W" },
    });
    const official = standings([s]).find((r) => r.manager === members[0])!;
    const filtered = standings([s], true).find(
      (r) => r.manager === members[0],
    )!;
    expect(official.average).toBe(50);
    expect(filtered.average).toBe(100);
    expect(filtered).toMatchObject({
      points: official.points,
      wins: official.wins,
      losses: official.losses,
      games: 2,
      missed: 1,
      averageGames: 1,
    });
    expect(
      standings([s], true).find((r) => r.manager === members[2])?.average,
    ).toBeNull();
    expect(
      scoringHistory([s], members[0], true).filter((d) => d.score !== null),
    ).toHaveLength(1);
    expect(scoringHistory([s], members[0], true)[1].score).toBeNull();
  });
  it("does not create games for absent scores or count membership outside a season", () => {
    const s = season();
    s.matchups = s.matchups.slice(0, 1);
    const next = {
      ...season(),
      year: 2020,
      members: ["new_manager"],
      matchups: [],
    };
    expect(games([s])).toHaveLength(2);
    expect(
      standings([s, next]).find((r) => r.manager === "new_manager"),
    ).toMatchObject({ seasons: 1, games: 0, average: null });
    expect(
      standings([s]).find((r) => r.manager === "new_manager"),
    ).toBeUndefined();
  });
});
describe("official result authority", () => {
  it("keeps a verified official tie-break result instead of inferring W/L from scores", () => {
    const s = season();
    s.matchups[2].home.result = "W";
    s.matchups[2].away.result = "L";
    expect(seasonSchema.safeParse(s).success).toBe(true);
    expect(games([s]).find((g) => g.manager === members[4])?.result).toBe("W");
    expect(luckTable([s]).find((g) => g.manager === members[4])?.actual).toBe(
      1,
    );
  });
  it("rejects official zero ties and unsafe provenance", () => {
    const s = season();
    s.matchups[1].home.result = "T";
    expect(seasonSchema.safeParse(s).success).toBe(false);
    const valid = season();
    expect(
      seasonSchema.safeParse({
        ...valid,
        matchups: [
          {
            ...valid.matchups[0],
            provenance: {
              sourceId: "annual-2019",
              sheet: "Schedule/Results",
              cells: ["A1:J3"],
            },
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      seasonSchema.safeParse({
        ...valid,
        matchups: [
          {
            ...valid.matchups[0],
            provenance: {
              sourceId: "private@example.invalid",
              sheet: "Contacts",
              cells: ["A1"],
            },
          },
        ],
      }).success,
    ).toBe(false);
  });
});
describe("schedule luck", () => {
  it("compares all 15 opposing scores only in complete 16-manager weeks", () => {
    const s = season();
    const rows = luckTable([s]);
    expect(rows).toHaveLength(16);
    expect(completeWeeks(s)).toEqual([1]);
    expect(rows.find((r) => r.manager === members[6])).toMatchObject({
      expected: 1,
      actual: 1,
      luck: 0,
      allPlayWins: 15,
    });
    expect(rows.find((r) => r.manager === members[2])).toMatchObject({
      actual: 0,
      allPlayLosses: 14,
      allPlayTies: 1,
    });
    const tie = rows.find((r) => r.manager === members[4])!;
    expect(tie.expected).toBeCloseTo((11 + 2 * 0.5) / 15); // 100 ties two other 100s; eleven lower scores.
    expect(tie.actual).toBe(0);
    expect(tie.luck).toBeCloseTo(-tie.expected);
    expect(rows.find((r) => r.manager === members[2])?.expected).toBeCloseTo(
      0.5 / 15,
    );
    expect(rows.reduce((n, r) => n + r.expected, 0)).toBeCloseTo(8);
    s.matchups.pop();
    expect(luckTable([s])).toEqual([]);
  });
  it("never compares results from different weeks or seasons", () => {
    const a = season();
    const b = {
      ...season(),
      year: 2020,
      matchups: season().matchups.slice(0, 2),
    };
    expect(luckTable([a, b]).every((r) => r.weeks === 1)).toBe(true);
  });
});
describe("records, rivalries and lineup coverage", () => {
  it("preserves all tied records and links to a real underlying matchup", () => {
    const s = season([
      120, 90, 0, 0, 100, 100, 120, 110, 80, 70, 60, 50, 40, 30, 20, 10,
    ]);
    const ceilings = records([verifiedSeason(s)]).filter(
      (r) => r.title === "The ceiling",
    );
    expect(ceilings).toHaveLength(2);
    expect(
      ceilings.every((r) => s.matchups.some((m) => m.id === r.game.id)),
    ).toBe(true);
    expect(
      records([verifiedSeason(s)]).find((r) => r.title === "The basement")
        ?.value,
    ).toBe(10);
    expect(records([])).toEqual([]);
  });
  it("breaks streaks at missing weeks and season boundaries, with source-linked streak records", () => {
    const s = season();
    s.matchups.push({ ...s.matchups[0], id: "2019-w2-test", week: 2 });
    s.matchups.push({ ...s.matchups[0], id: "2019-w4-test", week: 4 });
    expect(longestStreak([s], members[0], "W")).toBe(2);
    expect(
      longestStreak([s, { ...season(), year: 2020 }], members[0], "W"),
    ).toBe(2);
    const record = records([verifiedSeason(s)]).find(
      (r) => r.title === "Heat check",
    );
    expect(record?.game.id).toBe("2019-w2-test");
    expect(record?.value).toBe(2);
  });
  it("selects only direct rival matchups", () => {
    expect(rivalry([season()], members[0], members[1])).toHaveLength(1);
    expect(rivalry([season()], members[0], members[4])).toEqual([]);
  });
  it("uses known lineups as ownership denominator while keeping all scores", () => {
    const s = season();
    s.lineups = [testLineup()];
    expect(playerOwnership([s])[0].ownership).toBe(1);
    expect(playerOwnership([s], members[1])).toEqual([]);
    expect(games([s])).toHaveLength(16);
    expect(lineupStrategies([s])).toMatchObject({
      count: 1,
      averageSalary: 45000,
      stackRate: 1,
    });
    expect(lineupSchema.safeParse(testLineup()).success).toBe(true); // negative player deductions are valid
  });
});
describe("specification regression cases", () => {
  it("separates official double losses from numerical all-play ties, including negative scores", () => {
    expect(outcome(0, 0)).toBe("L");
    expect(allPlayOutcome(0, 0)).toBe("T");
    expect(outcome(-1, 0)).toBe("W");
    expect(allPlayOutcome(-1, 0)).toBe("L");
    const allZeros = luckTable([season(Array(16).fill(0))]);
    expect(
      allZeros.every(
        (r) =>
          r.actual === 0 &&
          r.expected === 0.5 &&
          r.allPlayTies === 15 &&
          r.luck === -0.5,
      ),
    ).toBe(true);
  });
  it("never publishes record holders from unverified or partial imports", () => {
    const raw = season();
    expect(records([raw])).toEqual([]);
    expect(
      records([{ ...verifiedSeason(raw), verification: "unverified" }]),
    ).toEqual([]);
    expect(records([verifiedSeason(raw)]).length).toBeGreaterThan(0);
    expect(
      seasonSchema.safeParse({ ...raw, verification: "reconciled" }).success,
    ).toBe(false);
    expect(seasonSchema.safeParse(verifiedSeason(raw)).success).toBe(true);
  });
  it("qualifies scoring averages by included scores and all-play by eligible weeks", () => {
    const s = season();
    s.matchups.push({
      id: "qualification-zero",
      week: 2,
      home: { manager: members[0], score: 0, result: "L" },
      away: { manager: members[1], score: 80, result: "W" },
    });
    expect(
      qualifiedLeaders([s], "wins", 2, true).map((r) => r.manager),
    ).toContain(members[0]);
    expect(
      qualifiedLeaders([s], "average", 2, true).map((r) => r.manager),
    ).not.toContain(members[0]);
    expect(
      qualifiedLeaders([s], "average", 2, false).map((r) => r.manager),
    ).toContain(members[0]);
    expect(qualifiedLeaders([s], "allPlayRate", 2)).toEqual([]);
    expect(qualifiedLeaders([s], "expected", 1)).toHaveLength(16);
  });
});
describe("import validation and privacy boundaries", () => {
  it("validates the actual repository dataset without inventing missing results", () => {
    const data = loadLeague();
    expect(data.seasons.map((s) => s.year)).toEqual([...YEARS]);
    expect(leagueSchema.safeParse(data).success).toBe(true);
  });
  it("rejects duplicate scores, unregistered managers and playoff weeks", () => {
    const s = season();
    expect(seasonSchema.safeParse(s).success).toBe(true);
    expect(
      seasonSchema.safeParse({ ...s, matchups: [...s.matchups, s.matchups[0]] })
        .success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({ ...s, members: members.slice(1) }).success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({
        ...s,
        matchups: [{ ...s.matchups[0], week: 15 }],
      }).success,
    ).toBe(false);
  });
  it("requires every regular-season game before declaring a season complete", () => {
    const s = season();
    expect(seasonSchema.safeParse({ ...s, status: "complete" }).success).toBe(
      false,
    );
    const full = {
      ...s,
      status: "complete",
      matchups: Array.from({ length: 14 }, (_, i) =>
        s.matchups.map((m) => ({ ...m, id: `${m.id}-w${i + 1}`, week: i + 1 })),
      ).flat(),
    };
    expect(seasonSchema.safeParse(full).success).toBe(true);
    expect(
      seasonSchema.safeParse({ ...full, regularSeasonWeeks: 15 }).success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({
        ...full,
        regularSeasonWeeks: 15,
        matchups: [
          ...full.matchups,
          ...s.matchups.map((m) => ({ ...m, id: `${m.id}-w15`, week: 15 })),
        ],
      }).success,
    ).toBe(true);
  });
  it("rejects private fields and contact-like manager IDs", () => {
    const league = loadLeague();
    expect(
      leagueSchema.safeParse({
        ...league,
        managers: [{ username: "test", email: "private@example.invalid" }],
      }).success,
    ).toBe(false);
    expect(
      leagueSchema.safeParse({
        ...league,
        managers: [{ username: "private@example.invalid" }],
      }).success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({ ...season(), sourceDocument: "private.pdf" })
        .success,
    ).toBe(false);
  });
  it("rejects malformed or over-cap lineups and lineups without an official score", () => {
    const l = testLineup();
    expect(
      lineupSchema.safeParse({ ...l, selections: l.selections.slice(1) })
        .success,
    ).toBe(false);
    expect(
      lineupSchema.safeParse({
        ...l,
        selections: l.selections.map((p) => ({ ...p, salary: 6000 })),
      }).success,
    ).toBe(false);
    expect(
      lineupSchema.safeParse({
        ...l,
        selections: l.selections.map((p) => ({ ...p, slot: "QB" })),
      }).success,
    ).toBe(false);
    expect(
      seasonSchema.safeParse({ ...season(), lineups: [{ ...l, week: 2 }] })
        .success,
    ).toBe(false);
  });
});
