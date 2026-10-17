import { canonical } from "./helpers/canonical";
import dnaManifest from "./fixtures/dna-import-manifest.json";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadLeague } from "../lib/data";
import {
  games,
  luckTable,
  qualifiedLeaders,
  records,
  rivalry,
  standings,
} from "../lib/analytics";
import { seasonSchema, type Season } from "../lib/schema";
import manifest from "./fixtures/history-import-manifest.json";
import sourceAudit from "./fixtures/history-workbook-reconciliation.json";
const league = loadLeague();
const cents = (score: number) => Math.round(score * 100);
// Independent audit deliberately reads raw matchup sides rather than using games().
function sourceRows(seasons: Season[]) {
  return seasons.flatMap((s) =>
    s.matchups.flatMap((m) => [
      {
        ...m.home,
        id: m.id,
        year: s.year,
        week: m.week,
        opponent: m.away.manager,
        against: m.away.score,
      },
      {
        ...m.away,
        id: m.id,
        year: s.year,
        week: m.week,
        opponent: m.home.manager,
        against: m.home.score,
      },
    ]),
  );
}
describe("2019–2025 historical import", () => {
  it("preserves official score data and usernames while allowing verified lineup imports", () => {
    for (const [file, hash] of Object.entries(manifest.files)) {
      const raw = readFileSync(file);
      if (file.endsWith("managers.json"))
        expect(createHash("sha256").update(raw).digest("hex"), file).toBe(hash);
      else {
        const source = JSON.parse(raw.toString());
        source.lineups = [];
        expect(
          createHash("sha256").update(canonical(source)).digest("hex"),
          file,
        ).toBe(
          dnaManifest.officialProjection[
            String(source.year) as keyof typeof dnaManifest.officialProjection
          ],
        );
      }
    }
  });
  it("contains exactly 824 matchups, 1648 scores, 26 identities, 103 weeks and 12 no-shows", () => {
    expect(league.managers).toHaveLength(26);
    expect(new Set(league.managers.map((m) => m.username)).size).toBe(26);
    expect(league.seasons.flatMap((s) => s.matchups)).toHaveLength(824);
    const all = games(league.seasons);
    expect(all).toHaveLength(1648);
    expect(new Set(all.map((g) => `${g.year}-${g.week}`)).size).toBe(103);
    expect(all.filter((g) => g.score === 0)).toHaveLength(12);
    expect(
      all.filter((g) => g.score === 0).every((g) => g.result === "L"),
    ).toBe(true);
    expect(all.reduce((n, g) => n + cents(g.score), 0)).toBe(21046522);
  });
  for (const expected of manifest.seasons)
    it(`${expected.year}: full coverage and audited source totals`, () => {
      const s = league.seasons.find((s) => s.year === expected.year)!;
      const g = sourceRows([s]);
      expect(standings([s])[0].manager).toBe(
        sourceAudit.find((r) => r.year === s.year)?.seasonStandingsLeader,
      );
      expect(s.status).toBe("complete");
      expect(s.verification).toBe("reconciled");
      expect(s.regularSeasonWeeks).toBe(expected.weeks);
      expect(s.members).toHaveLength(16);
      expect(s.matchups).toHaveLength(expected.matchups);
      expect(g).toHaveLength(expected.scores);
      expect(g.filter((r) => r.score === 0)).toHaveLength(expected.zeros);
      expect(g.filter((r) => r.result === "W")).toHaveLength(expected.wins);
      expect(g.filter((r) => r.result === "L")).toHaveLength(expected.losses);
      expect(g.filter((r) => r.result === "T")).toHaveLength(expected.ties);
      expect(g.reduce((n, r) => n + cents(r.score), 0)).toBe(
        cents(Number(expected.points)),
      );
      for (let week = 1; week <= expected.weeks; week++) {
        const weekly = g.filter((r) => r.week === week);
        expect(weekly).toHaveLength(16);
        expect(new Set(weekly.map((r) => r.manager)).size).toBe(16);
      }
      expect(
        s.matchups.every(
          (m) =>
            m.provenance?.sourceId === `season_${s.year}` &&
            m.provenance.cells.length === 2,
        ),
      ).toBe(true);
    });
  it("reconciles all career and season W/L, totals, rates and rankings independently", () => {
    for (const scope of [league.seasons, ...league.seasons.map((s) => [s])]) {
      const source = sourceRows(scope);
      const independent = [...new Set(source.map((g) => g.manager))]
        .map((manager) => {
          const rows = source.filter((g) => g.manager === manager);
          return {
            manager,
            games: rows.length,
            wins: rows.filter((g) => g.result === "W").length,
            losses: rows.filter((g) => g.result === "L").length,
            ties: rows.filter((g) => g.result === "T").length,
            points: rows.reduce((n, g) => n + cents(g.score), 0),
            against: rows.reduce((n, g) => n + cents(g.against), 0),
            missed: rows.filter((g) => g.score === 0).length,
          };
        })
        .sort(
          (a, b) =>
            b.wins - a.wins ||
            b.points - a.points ||
            a.manager.localeCompare(b.manager),
        );
      const actual = standings(scope);
      expect(actual.map((r) => r.manager)).toEqual(
        independent.map((r) => r.manager),
      );
      independent.forEach((expected, index) => {
        const row = actual[index];
        expect(row).toMatchObject({
          manager: expected.manager,
          games: expected.games,
          wins: expected.wins,
          losses: expected.losses,
          ties: expected.ties,
          missed: expected.missed,
        });
        expect(row.points).toBeCloseTo(expected.points / 100, 8);
        expect(row.against).toBeCloseTo(expected.against / 100, 8);
        expect(row.average).toBeCloseTo(
          expected.points / 100 / expected.games,
          8,
        );
        expect(row.winRate).toBeCloseTo(
          (expected.wins + expected.ties / 2) / expected.games,
          8,
        );
        expect(row.rank).toBe(
          independent.findIndex(
            (r) => r.wins === expected.wins && r.points === expected.points,
          ) + 1,
        );
      });
    }
    for (const expected of manifest.career) {
      const row = standings(league.seasons).find(
        (r) => r.manager === expected.manager,
      )!;
      expect(row.wins).toBe(expected.wins);
      expect(row.losses).toBe(expected.losses);
      expect(row.points).toBeCloseTo(Number(expected.points), 8);
    }
  });
  it("sorts genuine scoring leaders and changes only average denominators when zeros are excluded", () => {
    expect(qualifiedLeaders(league.seasons, "wins", 1)[0]).toMatchObject({
      manager: "smallery",
      wins: 63,
    });
    expect(qualifiedLeaders(league.seasons, "points", 1)[0].manager).toBe(
      "mrosato92",
    );
    expect(qualifiedLeaders(league.seasons, "points", 1)[0].points).toBeCloseTo(
      13889.72,
      8,
    );
    for (const scope of [league.seasons, ...league.seasons.map((s) => [s])]) {
      const full = standings(scope),
        filtered = standings(scope, true);
      for (const a of full) {
        const b = filtered.find((b) => b.manager === a.manager)!;
        expect(b).toMatchObject({
          wins: a.wins,
          losses: a.losses,
          points: a.points,
          games: a.games,
          missed: a.missed,
          rank: a.rank,
        });
        expect(b.averageGames).toBe(a.games - a.missed);
        if (b.averageGames)
          expect(b.average).toBeCloseTo(a.points / b.averageGames, 8);
      }
    }
  });
  it("verifies all 325 unordered head-to-head histories in both directions", () => {
    let total = 0;
    const users = league.managers.map((m) => m.username);
    const source = sourceRows(league.seasons);
    for (let a = 0; a < users.length; a++)
      for (let b = a + 1; b < users.length; b++) {
        for (const [first, second] of [
          [users[a], users[b]],
          [users[b], users[a]],
        ]) {
          const expected = source
            .filter((r) => r.manager === first && r.opponent === second)
            .sort((x, y) => y.year - x.year || y.week - x.week);
          const actual = rivalry(league.seasons, first, second);
          expect(actual).toHaveLength(expected.length);
          expect(
            actual.map((g) => [
              g.id,
              g.result,
              cents(g.score),
              cents(g.against),
            ]),
          ).toEqual(
            expected.map((g) => [
              g.id,
              g.result,
              cents(g.score),
              cents(g.against),
            ]),
          );
          if (first === users[a]) total += actual.length;
        }
      }
    expect(total).toBe(824);
  });
  it("independently verifies every weekly and career all-play record and expected-win fraction", () => {
    const source = sourceRows(league.seasons);
    const reference = new Map<
      string,
      {
        weeks: number;
        wins: number;
        losses: number;
        ties: number;
        actual: number;
      }
    >();
    let comparisons = 0;
    for (const row of source) {
      const opponents = source.filter(
        (other) =>
          other.year === row.year &&
          other.week === row.week &&
          other.manager !== row.manager,
      );
      expect(opponents).toHaveLength(15);
      const aggregate = reference.get(row.manager) ?? {
        weeks: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        actual: 0,
      };
      aggregate.weeks++;
      aggregate.actual += Number(row.result === "W");
      for (const other of opponents) {
        comparisons++;
        if (cents(row.score) > cents(other.score)) aggregate.wins++;
        else if (cents(row.score) < cents(other.score)) aggregate.losses++;
        else aggregate.ties++;
      }
      reference.set(row.manager, aggregate);
    }
    expect(comparisons).toBe(24720);
    const actual = luckTable(league.seasons);
    for (const row of actual) {
      const expected = reference.get(row.manager)!;
      expect(row).toMatchObject({
        weeks: expected.weeks,
        allPlayWins: expected.wins,
        allPlayLosses: expected.losses,
        allPlayTies: expected.ties,
        actual: expected.actual,
      });
      expect(row.expected).toBeCloseTo(
        (2 * expected.wins + expected.ties) / 30,
        10,
      );
      expect(row.luck).toBeCloseTo(
        expected.actual - (2 * expected.wins + expected.ties) / 30,
        10,
      );
    }
    expect(actual.reduce((n, r) => n + r.expected, 0)).toBeCloseTo(824, 10);
    expect(actual.reduce((n, r) => n + r.actual, 0)).toBe(824);
    for (const season of league.seasons)
      for (let week = 1; week <= season.regularSeasonWeeks!; week++) {
        const scoped = {
          ...season,
          matchups: season.matchups.filter((m) => m.week === week),
        };
        const weekly = luckTable([scoped]);
        expect(weekly).toHaveLength(16);
        expect(weekly.reduce((n, r) => n + r.expected, 0)).toBeCloseTo(8, 10);
        for (const row of weekly) {
          const score = source.find(
            (g) =>
              g.year === season.year &&
              g.week === week &&
              g.manager === row.manager,
          )!;
          const others = source.filter(
            (g) =>
              g.year === season.year &&
              g.week === week &&
              g.manager !== row.manager,
          );
          const units = others.reduce(
            (n, g) =>
              n +
              (cents(score.score) > cents(g.score)
                ? 2
                : cents(score.score) === cents(g.score)
                  ? 1
                  : 0),
            0,
          );
          expect(row.expected).toBeCloseTo(units / 30, 10);
        }
      }
  });
  it("checks every manager-season all-play aggregate against independent score comparisons", () => {
    for (const season of league.seasons) {
      const source = sourceRows([season]);
      const actual = luckTable([season]);
      for (const manager of season.members) {
        const own = source.filter((r) => r.manager === manager);
        let wins = 0,
          losses = 0,
          ties = 0;
        for (const r of own)
          for (const other of source.filter(
            (o) => o.week === r.week && o.manager !== manager,
          )) {
            if (cents(r.score) > cents(other.score)) wins++;
            else if (cents(r.score) < cents(other.score)) losses++;
            else ties++;
          }
        const row = actual.find((r) => r.manager === manager)!;
        expect(row).toMatchObject({
          weeks: season.regularSeasonWeeks,
          allPlayWins: wins,
          allPlayLosses: losses,
          allPlayTies: ties,
          actual: own.filter((r) => r.result === "W").length,
        });
        expect(row.expected).toBeCloseTo((2 * wins + ties) / 30, 10);
        expect(row.luck).toBeCloseTo(row.actual - (2 * wins + ties) / 30, 10);
      }
    }
  });
  it("publishes record receipts from reconciled sources without fabricating lineup details", () => {
    const all = sourceRows(league.seasons);
    const found = records(league.seasons);
    expect(found.find((r) => r.title === "The ceiling")?.value).toBe(
      Math.max(...all.map((g) => g.score)),
    );
    expect(found.filter((r) => r.title === "The floor")).toHaveLength(12);
    expect(
      found.every((r) =>
        all.some((g) => g.id === r.game.id && g.manager === r.game.manager),
      ),
    ).toBe(true);
    expect(league.seasons.flatMap((s) => s.lineups)).toHaveLength(1574);
  });
  it("supports public username punctuation in stable matchup IDs without accepting path traversal", () => {
    const s = league.seasons[0],
      m = s.matchups[0];
    for (const id of [".", "..", "../private", "a/b", "a?b", "a#b"]) {
      expect(
        seasonSchema.safeParse({
          ...s,
          matchups: s.matchups.map((row, i) => (i ? row : { ...m, id })),
        }).success,
      ).toBe(false);
    }
    expect(
      league.seasons[0].matchups.some((m) => m.id.includes("G.Logan319")),
    ).toBe(true);
  });
});
