import type { League } from "./schema";
import type { SectionId } from "./navigation";
/** Keep the 14k selections off unrelated static pages while retaining accurate archive totals. */
export function dashboardData(
  league: League,
  scope: { section: SectionId; username?: string; matchId?: string },
) {
  const receipt = scope.matchId
    ? league.seasons.flatMap((s) =>
        s.matchups
          .filter((m) => m.id === scope.matchId)
          .map((m) => ({
            year: s.year,
            week: m.week,
            managers: [m.home.manager, m.away.manager],
          })),
      )[0]
    : undefined;
  return {
    lineupCounts: Object.fromEntries(
      league.seasons.map((s) => [s.year, s.lineups.length]),
    ),
    league: {
      ...league,
      seasons: league.seasons.map((s) => ({
        ...s,
        lineups: s.lineups.filter((l) => {
          if (scope.section === "dna") return true;
          if (scope.section === "managers" && scope.username)
            return l.manager === scope.username;
          return (
            !!receipt &&
            s.year === receipt.year &&
            l.week === receipt.week &&
            receipt.managers.includes(l.manager)
          );
        }),
      })),
    },
  };
}
