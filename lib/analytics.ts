import type { League, Season, Matchup } from "./schema";

export type Result = "W" | "L" | "T";
/** Official zero-loss rule; imported official results remain authoritative. */
export function outcome(score: number, opponent: number): Result {
  if (score === 0) return "L";
  if (opponent === 0 || score > opponent) return "W";
  return score === opponent ? "T" : "L";
}
/** Hypothetical all-play compares scores, including ties between missed submissions. */
export function allPlayOutcome(score: number, opponent: number): Result {
  return score > opponent ? "W" : score < opponent ? "L" : "T";
}
export type Game = {
  id: string;
  year: number;
  week: number;
  manager: string;
  opponent: string;
  score: number;
  against: number;
  result: Result;
};
export function games(seasons: Season[]): Game[] {
  return seasons.flatMap((s) =>
    s.matchups.flatMap((m) => [
      {
        id: m.id,
        year: s.year,
        week: m.week,
        manager: m.home.manager,
        opponent: m.away.manager,
        score: m.home.score,
        against: m.away.score,
        result: m.home.result,
      },
      {
        id: m.id,
        year: s.year,
        week: m.week,
        manager: m.away.manager,
        opponent: m.home.manager,
        score: m.away.score,
        against: m.home.score,
        result: m.away.result,
      },
    ]),
  );
}
export type Standing = {
  rank: number;
  manager: string;
  wins: number;
  losses: number;
  ties: number;
  games: number;
  points: number;
  against: number;
  average: number | null;
  averageGames: number;
  best: number | null;
  missed: number;
  seasons: number;
  winRate: number | null;
};
export function standings(seasons: Season[], excludeZeros = false): Standing[] {
  const all = games(seasons);
  const members = [...new Set(seasons.flatMap((s) => s.members))];
  return members
    .map((manager) => {
      const g = all.filter((g) => g.manager === manager);
      const scoring = g.filter((g) => !excludeZeros || g.score !== 0);
      const wins = g.filter((g) => g.result === "W").length;
      const ties = g.filter((g) => g.result === "T").length;
      return {
        manager,
        wins,
        losses: g.filter((g) => g.result === "L").length,
        ties,
        games: g.length,
        points: g.reduce((n, g) => n + g.score, 0),
        against: g.reduce((n, g) => n + g.against, 0),
        average: scoring.length
          ? scoring.reduce((n, g) => n + g.score, 0) / scoring.length
          : null,
        averageGames: scoring.length,
        best: g.length ? Math.max(...g.map((g) => g.score)) : null,
        missed: g.filter((g) => g.score === 0).length,
        seasons: seasons.filter((s) => s.members.includes(manager)).length,
        winRate: g.length ? (wins + ties / 2) / g.length : null,
      };
    })
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.points - a.points ||
        a.manager.localeCompare(b.manager),
    )
    .map((r, _index, sorted) => ({
      ...r,
      rank:
        sorted.findIndex(
          (peer) => peer.wins === r.wins && peer.points === r.points,
        ) + 1,
    }));
}
export function completeWeeks(season: Season) {
  if (season.members.length !== 16) return [];
  return Array.from(
    { length: season.regularSeasonWeeks ?? 0 },
    (_, i) => i + 1,
  ).filter(
    (week) => season.matchups.filter((m) => m.week === week).length === 8,
  );
}
export type LuckRow = {
  manager: string;
  weeks: number;
  allPlayWins: number;
  allPlayLosses: number;
  allPlayTies: number;
  expected: number;
  actual: number;
  luck: number;
  opponentPoints: number;
  opponentAverage: number;
};
export function luckTable(seasons: Season[]): LuckRow[] {
  const rows = new Map<string, LuckRow>();
  for (const season of seasons)
    for (const week of completeWeeks(season)) {
      const weekly = games([season]).filter((g) => g.week === week);
      for (const g of weekly) {
        const row = rows.get(g.manager) ?? {
          manager: g.manager,
          weeks: 0,
          allPlayWins: 0,
          allPlayLosses: 0,
          allPlayTies: 0,
          expected: 0,
          actual: 0,
          luck: 0,
          opponentPoints: 0,
          opponentAverage: 0,
        };
        const results = weekly
          .filter((other) => other.manager !== g.manager)
          .map((other) => allPlayOutcome(g.score, other.score));
        const w = results.filter((r) => r === "W").length;
        const t = results.filter((r) => r === "T").length;
        row.weeks++;
        row.opponentPoints += g.against;
        row.opponentAverage = row.opponentPoints / row.weeks;
        row.allPlayWins += w;
        row.allPlayTies += t;
        row.allPlayLosses += results.length - w - t;
        row.expected += (w + t * 0.5) / results.length;
        row.actual += g.result === "W" ? 1 : 0;
        row.luck = row.actual - row.expected;
        rows.set(g.manager, row);
      }
    }
  return [...rows.values()].sort((a, b) => b.luck - a.luck);
}
export function rivalry(seasons: Season[], a: string, b: string) {
  return games(seasons)
    .filter((g) => g.manager === a && g.opponent === b)
    .sort((x, y) => y.year - x.year || y.week - x.week);
}
/** Streaks reset at each season boundary, unknown week, or nonmatching result. */
export function streakRuns(
  seasons: Season[],
  predicate: (game: Game) => boolean,
) {
  const runs: { length: number; game: Game }[] = [];
  for (const season of seasons) {
    const all = games([season]);
    for (const manager of season.members) {
      const weekly = all
        .filter((g) => g.manager === manager)
        .sort((a, b) => a.week - b.week);
      let length = 0,
        previous = 0;
      for (const game of weekly) {
        length = predicate(game)
          ? game.week === previous + 1
            ? length + 1
            : 1
          : 0;
        if (length) runs.push({ length, game });
        previous = game.week;
      }
    }
  }
  return runs;
}
export function longestStreak(
  seasons: Season[],
  manager: string,
  result: Result,
) {
  return Math.max(
    0,
    ...streakRuns(
      seasons,
      (g) => g.manager === manager && g.result === result,
    ).map((r) => r.length),
  );
}
export type RecordEntry = {
  title: string;
  subtitle: string;
  value: number;
  unit: string;
  game: Game;
  kind: "glory" | "shame";
};
export function records(seasons: Season[]): RecordEntry[] {
  // Completeness alone is not source reconciliation. Never award unverified records.
  seasons = seasons.filter(
    (s) => s.status === "complete" && s.verification === "reconciled",
  );
  const all = games(seasons);
  if (!all.length) return [];
  const entries: RecordEntry[] = [];
  const add = (
    title: string,
    subtitle: string,
    list: Game[],
    value: (g: Game) => number,
    unit: string,
    kind: "glory" | "shame",
    ascending = false,
  ) => {
    if (!list.length) return;
    const sorted = [...list].sort(
      (a, b) =>
        (ascending ? 1 : -1) * (value(a) - value(b)) ||
        a.year - b.year ||
        a.week - b.week ||
        a.manager.localeCompare(b.manager),
    );
    // Retain every tied record; a deterministic sort controls display order only.
    const best = value(sorted[0]);
    for (const game of sorted.filter((g) => Math.abs(value(g) - best) < 1e-8))
      entries.push({ title, subtitle, value: value(game), unit, game, kind });
  };
  add(
    "The ceiling",
    "Highest single-week score",
    all,
    (g) => g.score,
    "PTS",
    "glory",
  );
  add(
    "Won by a whisker",
    "Smallest winning margin",
    all.filter((g) => g.result === "W"),
    (g) => g.score - g.against,
    "PTS",
    "glory",
    true,
  );
  add(
    "Unnecessary roughness",
    "Largest winning margin",
    all.filter((g) => g.result === "W"),
    (g) => g.score - g.against,
    "PTS",
    "glory",
  );
  add(
    "Wrong place, wrong week",
    "Highest score in a loss",
    all.filter((g) => g.result === "L"),
    (g) => g.score,
    "PTS",
    "shame",
  );
  add(
    "Task failed successfully",
    "Lowest score in a win",
    all.filter((g) => g.result === "W"),
    (g) => g.score,
    "PTS",
    "shame",
    true,
  );
  add(
    "The floor",
    "Lowest official score (missed submissions included)",
    all,
    (g) => g.score,
    "PTS",
    "shame",
    true,
  );
  add(
    "The basement",
    "Lowest submitted score (zeros excluded)",
    all.filter((g) => g.score !== 0),
    (g) => g.score,
    "PTS",
    "shame",
    true,
  );
  for (const definition of [
    {
      title: "Heat check",
      subtitle: "Longest single-season winning streak",
      kind: "glory" as const,
      predicate: (g: Game) => g.result === "W",
    },
    {
      title: "The spiral",
      subtitle: "Longest single-season losing streak",
      kind: "shame" as const,
      predicate: (g: Game) => g.result === "L",
    },
    {
      title: "Attendance optional",
      subtitle: "Longest consecutive missed-submission run",
      kind: "shame" as const,
      predicate: (g: Game) => g.score === 0,
    },
  ]) {
    const runs = streakRuns(seasons, definition.predicate);
    const best = Math.max(0, ...runs.map((r) => r.length));
    for (const run of runs.filter((r) => r.length === best))
      entries.push({
        title: definition.title,
        subtitle: definition.subtitle,
        value: best,
        unit: "WEEKS",
        game: run.game,
        kind: definition.kind,
      });
  }
  return entries;
}
export function playerOwnership(seasons: Season[], manager?: string) {
  const lineups = seasons
    .flatMap((s) => s.lineups)
    .filter((l) => !manager || l.manager === manager);
  const players = new Map<
    string,
    {
      id: string;
      name: string;
      position: string;
      selections: number;
      salary: number;
      ownership: number;
    }
  >();
  for (const l of lineups)
    for (const p of l.selections) {
      const row = players.get(p.playerId) ?? {
        id: p.playerId,
        name: p.name,
        position: p.position,
        selections: 0,
        salary: 0,
        ownership: 0,
      };
      row.selections++;
      row.salary += p.salary;
      row.ownership = row.selections / lineups.length;
      players.set(p.playerId, row);
    }
  return [...players.values()]
    .map((p) => ({ ...p, salary: p.salary / p.selections }))
    .sort(
      (a, b) => b.selections - a.selections || a.name.localeCompare(b.name),
    );
}
export function lineupStrategies(seasons: Season[], manager?: string) {
  const lineups = seasons
    .flatMap((s) => s.lineups)
    .filter((l) => !manager || l.manager === manager);
  if (!lineups.length) return null;
  const stacks = lineups.filter((l) => {
    const qb = l.selections.find((p) => p.slot === "QB");
    return (
      qb &&
      l.selections.some(
        (p) => ["WR", "TE"].includes(p.position) && p.team === qb.team,
      )
    );
  }).length;
  return {
    count: lineups.length,
    averageSalary:
      lineups.reduce(
        (sum, l) => sum + l.selections.reduce((n, p) => n + p.salary, 0),
        0,
      ) / lineups.length,
    stackRate: stacks / lineups.length,
    flex: ["RB", "WR", "TE"].map((position) => ({
      position,
      count: lineups.filter(
        (l) =>
          l.selections.find((p) => p.slot === "FLEX")?.position === position,
      ).length,
    })),
  };
}
export function scoringHistory(
  seasons: Season[],
  manager?: string,
  excludeZeros = false,
) {
  return seasons.flatMap((s) => {
    const relevant = games([s]).filter(
      (g) => !manager || g.manager === manager,
    );
    if (!relevant.length) return [];
    return Array.from(
      { length: s.regularSeasonWeeks ?? 0 },
      (_, i) => i + 1,
    ).map((week) => {
      const weekly = relevant.filter(
        (g) => g.week === week && (!excludeZeros || g.score !== 0),
      );
      return {
        label: `${s.year} W${week}`,
        score: weekly.length
          ? weekly.reduce((sum, g) => sum + g.score, 0) / weekly.length
          : null,
        count: weekly.length,
      };
    });
  });
}
export function matchupById(
  league: League,
  id: string,
): { season: Season; matchup: Matchup } | undefined {
  for (const season of league.seasons) {
    const matchup = season.matchups.find((m) => m.id === id);
    if (matchup) return { season, matchup };
  }
}

/** Totals and rate denominators remain distinct when qualifying leaders. */
export function leaderboardRows(seasons: Season[], excludeZeros = false) {
  const luck = new Map(luckTable(seasons).map((row) => [row.manager, row]));
  return standings(seasons, excludeZeros).map((row) => {
    const eligible = luck.get(row.manager);
    return {
      ...row,
      eligibleWeeks: eligible?.weeks ?? 0,
      allPlayRate: eligible
        ? (eligible.allPlayWins + eligible.allPlayTies / 2) /
          (eligible.weeks * 15)
        : null,
      expected: eligible?.expected ?? null,
      luck: eligible?.luck ?? null,
    };
  });
}
export const leaderboardMetrics = [
  "wins",
  "winRate",
  "points",
  "average",
  "allPlayRate",
  "expected",
] as const;
export type LeaderboardMetric = (typeof leaderboardMetrics)[number];
export function qualifiedLeaders(
  seasons: Season[],
  metric: LeaderboardMetric,
  minimum: number,
  excludeZeros = false,
) {
  return leaderboardRows(seasons, excludeZeros)
    .filter((row) => {
      const denominator =
        metric === "average"
          ? row.averageGames
          : ["allPlayRate", "expected"].includes(metric)
            ? row.eligibleWeeks
            : row.games;
      return denominator >= minimum && row[metric] !== null;
    })
    .sort(
      (a, b) =>
        (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity) ||
        b.points - a.points ||
        a.manager.localeCompare(b.manager),
    );
}
