import type { Season, Lineup } from "./schema";
export type Selection = Lineup["selections"][number];
/** A grouping key, never an invented NFL/DraftKings player ID. Names remain unmerged. */
export function selectionKey(p: Selection) {
  return p.playerId ? `id:${p.playerId}` : `name:${p.name}`;
}
export function observedLineups(seasons: Season[], manager?: string) {
  return seasons.flatMap((s) =>
    s.lineups
      .filter((l) => !manager || l.manager === manager)
      .map((l) => ({
        ...l,
        year: s.year,
        matchupId:
          s.matchups.find(
            (m) =>
              m.week === l.week &&
              [m.home.manager, m.away.manager].includes(l.manager),
          )?.id ?? null,
      })),
  );
}
export function coverageRows(seasons: Season[], manager?: string) {
  return seasons.flatMap((s) =>
    s.members
      .filter((m) => !manager || m === manager)
      .map((m) => {
        const official = s.matchups
          .flatMap((g) => [g.home, g.away])
          .filter((g) => g.manager === m);
        const lineups = s.lineups.filter((l) => l.manager === m);
        return {
          year: s.year,
          manager: m,
          observed: lineups.length,
          official: official.length,
          missing: official.length - lineups.length,
          missedSubmissions: official.filter((g) => g.score === 0).length,
          coverage: official.length ? lineups.length / official.length : null,
          unknown: lineups.reduce(
            (n, l) =>
              n + l.selections.filter((p) => p.position === null).length,
            0,
          ),
        };
      }),
  );
}
export function coverageSummary(seasons: Season[], manager?: string) {
  const rows = coverageRows(seasons, manager);
  const observed = rows.reduce((n, r) => n + r.observed, 0),
    official = rows.reduce((n, r) => n + r.official, 0);
  return {
    observed,
    official,
    missing: official - observed,
    coverage: official ? observed / official : null,
    unknown: rows.reduce((n, r) => n + r.unknown, 0),
    selections: observed * 9,
    missedSubmissions: rows.reduce((n, r) => n + r.missedSubmissions, 0),
  };
}
export function playerOwnership(
  seasons: Season[],
  manager?: string,
  filter: { position?: string; slot?: string } = {},
) {
  const lineups = observedLineups(seasons, manager);
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      positions: Set<string>;
      selections: number;
      salarySum: number;
      salarySamples: number;
      byManager: Map<string, number>;
    }
  >();
  for (const l of lineups)
    for (const p of l.selections) {
      if (filter.position && (p.position ?? "Unknown") !== filter.position)
        continue;
      if (
        filter.slot &&
        p.slot !== filter.slot &&
        p.slot.replace(/[123]$/, "") !== filter.slot
      )
        continue;
      const key = selectionKey(p);
      const r = groups.get(key) ?? {
        key,
        name: p.name,
        positions: new Set<string>(),
        selections: 0,
        salarySum: 0,
        salarySamples: 0,
        byManager: new Map<string, number>(),
      };
      r.positions.add(p.position ?? "Unknown");
      r.selections++;
      if (p.salary !== undefined && p.salary !== null) {
        r.salarySum += p.salary;
        r.salarySamples++;
      }
      r.byManager.set(l.manager, (r.byManager.get(l.manager) ?? 0) + 1);
      groups.set(key, r);
    }
  return [...groups.values()]
    .map((r) => ({
      key: r.key,
      name: r.name,
      position: [...r.positions].sort().join(" / "),
      selections: r.selections,
      ownership: r.selections / lineups.length,
      managers: r.byManager.size,
      repeatPicks: [...r.byManager.values()].reduce(
        (n, count) => n + Math.max(0, count - 1),
        0,
      ),
      salary:
        r.salarySamples === r.selections ? r.salarySum / r.salarySamples : null,
      salarySamples: r.salarySamples,
    }))
    .sort(
      (a, b) => b.selections - a.selections || a.name.localeCompare(b.name),
    );
}
export function lineupStrategies(seasons: Season[], manager?: string) {
  const lineups = observedLineups(seasons, manager);
  if (!lineups.length) return null;
  const salaryLineups = lineups.filter((l) =>
    l.selections.every((p) => p.salary != null),
  );
  const teamLineups = lineups.filter((l) =>
    l.selections.every((p) => p.team != null && p.position != null),
  );
  const stacked = teamLineups.filter((l) => {
    const qb = l.selections.find((p) => p.slot === "QB")!;
    return l.selections.some(
      (p) => (p.position === "WR" || p.position === "TE") && p.team === qb.team,
    );
  });
  return {
    count: lineups.length,
    salaryLineups: salaryLineups.length,
    teamLineups: teamLineups.length,
    averageSalary: salaryLineups.length
      ? salaryLineups.reduce(
          (n, l) => n + l.selections.reduce((sum, p) => sum + p.salary!, 0),
          0,
        ) / salaryLineups.length
      : null,
    stackRate: teamLineups.length ? stacked.length / teamLineups.length : null,
    flex: ["RB", "WR", "TE", "Unknown"].map((position) => ({
      position,
      count: lineups.filter(
        (l) =>
          (l.selections.find((p) => p.slot === "FLEX")?.position ??
            "Unknown") === position,
      ).length,
    })),
  };
}
export function positionalTrends(seasons: Season[], manager?: string) {
  return seasons.flatMap((s) => {
    const lineups = observedLineups([s], manager);
    if (!lineups.length) return [];
    return ["QB", "RB", "WR", "TE", "DST", "Unknown"].map((position) => {
      const count = lineups.reduce(
        (n, l) =>
          n +
          l.selections.filter((p) => (p.position ?? "Unknown") === position)
            .length,
        0,
      );
      return {
        year: s.year,
        position,
        count,
        lineups: lineups.length,
        share: count / (lineups.length * 9),
        perLineup: count / lineups.length,
      };
    });
  });
}
export function unknownSelections(seasons: Season[], manager?: string) {
  return observedLineups(seasons, manager).flatMap((l) =>
    l.selections
      .filter((p) => p.position === null)
      .map((p) => ({
        year: l.year,
        week: l.week,
        manager: l.manager,
        name: p.name,
        slot: p.slot,
        matchupId: l.matchupId,
      })),
  );
}
export function lineupOverlap(
  seasons: Season[],
  first: string,
  second: string,
) {
  if (!first || first === second)
    return {
      officialWeeks: 0,
      rows: [],
      averageShared: null,
      averageJaccard: null,
    };
  const rows: {
    year: number;
    week: number;
    shared: number;
    share: number;
    jaccard: number;
    common: string;
    firstMatchup: string | null;
    secondMatchup: string | null;
  }[] = [];
  let officialWeeks = 0;
  for (const s of seasons) {
    const official = new Map<number, Set<string>>();
    for (const m of s.matchups) {
      const members = official.get(m.week) ?? new Set<string>();
      members.add(m.home.manager);
      members.add(m.away.manager);
      official.set(m.week, members);
    }
    officialWeeks += [...official.values()].filter(
      (m) => m.has(first) && m.has(second),
    ).length;
    const available = observedLineups([s]);
    const b = new Map(
      available.filter((l) => l.manager === second).map((l) => [l.week, l]),
    );
    for (const a of available.filter((l) => l.manager === first)) {
      const opponent = b.get(a.week);
      if (!opponent) continue;
      const keys = new Set(opponent.selections.map(selectionKey));
      const common = a.selections.filter((p) => keys.has(selectionKey(p)));
      rows.push({
        year: s.year,
        week: a.week,
        shared: common.length,
        share: common.length / 9,
        jaccard: common.length / (18 - common.length),
        common: common.map((p) => p.name).join(", ") || "No shared labels",
        firstMatchup: a.matchupId,
        secondMatchup: opponent.matchupId,
      });
    }
  }
  rows.sort((a, b) => b.year - a.year || b.week - a.week);
  return {
    officialWeeks,
    rows,
    averageShared: rows.length
      ? rows.reduce((n, r) => n + r.shared, 0) / rows.length
      : null,
    averageJaccard: rows.length
      ? rows.reduce((n, r) => n + r.jaccard, 0) / rows.length
      : null,
  };
}
