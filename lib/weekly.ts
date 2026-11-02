import { completeWeeks, games, standings, type Game } from "./analytics";
import type { Season } from "./schema";

const verified = (seasons: Season[]) =>
  seasons.filter(
    (s) => s.status === "complete" && s.verification === "reconciled",
  );
export function extremes<T>(
  rows: T[],
  value: (row: T) => number,
  low = false,
): T[] {
  if (!rows.length) return [];
  const target = (low ? Math.min : Math.max)(...rows.map(value));
  return rows.filter((row) => value(row) === target);
}
export function weeklyWinners(seasons: Season[]) {
  return verified(seasons).flatMap((season) =>
    completeWeeks(season).flatMap((week) => {
      const rows = games([season]).filter((g) => g.week === week);
      const winners = extremes(rows, (g) => g.score);
      const runners = extremes(
        rows.filter((g) => g.score < winners[0].score),
        (g) => g.score,
      );
      return winners.map((game) => ({
        ...game,
        shared: winners.length > 1,
        coWinners: winners.map((g) => g.manager),
        runners,
        margin:
          winners.length > 1
            ? 0
            : runners.length
              ? Number((game.score - runners[0].score).toFixed(2))
              : 0,
      }));
    }),
  );
}
export function weeklyVictoryTable(seasons: Season[]) {
  const eligible = verified(seasons);
  const winners = weeklyWinners(eligible);
  const all = games(eligible).filter((g) =>
    completeWeeks(eligible.find((s) => s.year === g.year)!).includes(g.week),
  );
  return [...new Set(all.map((g) => g.manager))]
    .map((manager) => {
      const weeks = all.filter((g) => g.manager === manager).length;
      const victories = winners.filter((g) => g.manager === manager);
      return {
        manager,
        weeks,
        victories: victories.length,
        rate: victories.length / weeks,
        years: Object.fromEntries(
          eligible.map((s) => [
            s.year,
            victories.filter((g) => g.year === s.year).length,
          ]),
        ),
      };
    })
    .sort(
      (a, b) =>
        b.victories - a.victories ||
        b.rate - a.rate ||
        a.manager.localeCompare(b.manager),
    );
}
export function weeklyRecords(seasons: Season[], manager = "") {
  const eligible = verified(seasons);
  const wins = weeklyWinners(eligible).filter(
    (g) => !manager || g.manager === manager,
  );
  const seasonTotals = eligible.flatMap((s) =>
    weeklyVictoryTable([s])
      .filter((r) => !manager || r.manager === manager)
      .map((r) => ({ ...r, year: s.year })),
  );
  const runs: {
    manager: string;
    year: number;
    week: number;
    start: number;
    length: number;
  }[] = [];
  for (const s of eligible)
    for (const m of s.members.filter((m) => !manager || m === manager)) {
      let length = 0,
        previous = 0;
      for (const g of wins
        .filter((g) => g.year === s.year && g.manager === m)
        .sort((a, b) => a.week - b.week)) {
        length = g.week === previous + 1 ? length + 1 : 1;
        runs.push({
          manager: m,
          year: s.year,
          week: g.week,
          start: g.week - length + 1,
          length,
        });
        previous = g.week;
      }
    }
  return {
    season: extremes(
      seasonTotals.filter((r) => r.victories > 0),
      (r) => r.victories,
    ),
    streak: extremes(runs, (r) => r.length),
    highest: extremes(wins, (g) => g.score),
    lowest: extremes(wins, (g) => g.score, true),
  };
}
export function standingsThrough(season: Season, week: number) {
  return standings([
    { ...season, matchups: season.matchups.filter((m) => m.week <= week) },
  ]);
}
export function standingsMovement(season: Season, week: number) {
  const previous = week > 1 ? standingsThrough(season, week - 1) : [];
  return standingsThrough(season, week).map((row) => {
    const prev = previous.find((p) => p.manager === row.manager)?.rank ?? null;
    return {
      ...row,
      previous: prev,
      movement: prev === null ? null : prev - row.rank,
    };
  });
}
export function weeklyRecap(season: Season, week: number) {
  const rows = games([season])
    .filter((g) => g.week === week)
    .sort((a, b) => b.score - a.score || a.manager.localeCompare(b.manager));
  const average = rows.length
    ? rows.reduce((n, g) => n + g.score, 0) / rows.length
    : null;
  const scoring = rows.map((g) => ({
    ...g,
    rank: rows.findIndex((p) => p.score === g.score) + 1,
    relative: g.score - (average ?? 0),
  }));
  const movement = standingsMovement(season, week);
  const wins = scoring.filter((g) => g.result === "W");
  const losses = scoring.filter((g) => g.result === "L");
  const positiveMargins = wins.filter((g) => g.score > g.against);
  const awards = [
    {
      title: "King of the Week",
      winners: extremes(scoring, (g) => g.score),
      detail: "Highest weekly score. The entire room had to watch.",
    },
    {
      title: "Public Execution",
      winners: extremes(positiveMargins, (g) =>
        Number((g.score - g.against).toFixed(2)),
      ),
      detail:
        "Largest positive official winning margin. Subtlety was unavailable.",
    },
    {
      title: "Photo Finish",
      winners: extremes(
        positiveMargins,
        (g) => Number((g.score - g.against).toFixed(2)),
        true,
      ),
      detail: "Smallest positive official winning margin. Exhale.",
    },
    {
      title: "Lucky Bastard",
      winners: extremes(wins, (g) => g.rank),
      detail:
        "Lowest weekly scoring rank among official winners. Schedule says thanks.",
    },
    {
      title: "Brutal Loss",
      winners: extremes(losses, (g) => g.score),
      detail: "Highest score in an official loss. Points bought no sympathy.",
    },
    {
      title: "Biggest Climber",
      winners: extremes(
        movement.filter((r) => (r.movement ?? 0) > 0),
        (r) => r.movement!,
      ),
      detail:
        week === 1
          ? "Opening week: no previous standings to climb from."
          : "Largest positive rank movement since last week.",
    },
    {
      title: "Free Fall",
      winners: extremes(
        movement.filter((r) => (r.movement ?? 0) < 0),
        (r) => r.movement!,
        true,
      ),
      detail:
        week === 1
          ? "Opening week: no previous standings to fall from."
          : "Largest decline in rank since last week.",
    },
    {
      title: "Ice Cold",
      winners: extremes(scoring, (g) => g.score, true),
      detail: "Lowest weekly score. A challenging day for the scoreboard.",
    },
  ];
  const headlines: { title: string; games: Game[] }[] = [
    { title: "Top billing", games: extremes(rows, (g) => g.score) },
    {
      title: "The scoreboard basement",
      games: extremes(rows, (g) => g.score, true),
    },
    {
      title: "A win by a whisker",
      games: extremes(
        positiveMargins,
        (g) => Number((g.score - g.against).toFixed(2)),
        true,
      ),
    },
    {
      title: "The mercy rule called",
      games: extremes(positiveMargins, (g) =>
        Number((g.score - g.against).toFixed(2)),
      ),
    },
    {
      title: "All those points. Still an L",
      games: extremes(losses, (g) => g.score),
    },
    {
      title: "Just enough, apparently",
      games: extremes(wins, (g) => g.score, true),
    },
  ];
  return {
    scoring,
    average,
    movement,
    awards,
    headlines,
    matchups: season.matchups.filter((m) => m.week === week),
  };
}
