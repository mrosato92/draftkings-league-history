"use client";
import { useState } from "react";
import type { Season } from "@/lib/schema";
import {
  games,
  playerOwnership,
  qualifiedLeaders,
  type LeaderboardMetric,
} from "@/lib/analytics";
import {
  AverageToggle,
  DataTable,
  fmt,
  InfoNote,
  ManagerName,
  Panel,
  pct,
} from "./ui";
const metrics: { key: LeaderboardMetric; label: string }[] = [
  { key: "wins", label: "Official wins" },
  { key: "winRate", label: "Win percentage" },
  { key: "points", label: "Total points" },
  { key: "average", label: "Scoring average" },
  { key: "allPlayRate", label: "All-play percentage" },
  { key: "expected", label: "Expected wins" },
];
export function Leaderboards({
  seasons,
  excludeZeros,
  setExcludeZeros,
}: {
  seasons: Season[];
  excludeZeros: boolean;
  setExcludeZeros: (value: boolean) => void;
}) {
  const [metric, setMetric] = useState<LeaderboardMetric>("wins");
  const [minimum, setMinimum] = useState(1);
  const rows = qualifiedLeaders(seasons, metric, minimum, excludeZeros);
  const basis =
    metric === "average"
      ? "included scoring weeks"
      : ["allPlayRate", "expected"].includes(metric)
        ? "complete eligible weeks"
        : "imported games";
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Pick your measure of greatness.</h2>
          <p className="muted">
            Totals, rates, and the sample behind every claim.
          </p>
        </div>
        <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
      </div>
      <Panel title="Qualified career leaders">
        <div className="table-toolbar">
          <label className="qualification-filter">
            Rank by
            <select
              aria-label="Leaderboard metric"
              value={metric}
              onChange={(e) => {
                const next = e.target.value as LeaderboardMetric;
                setMetric(next);
                setMinimum(
                  ["winRate", "average", "allPlayRate"].includes(next) ? 14 : 1,
                );
              }}
            >
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="qualification-filter">
            Minimum {basis}
            <select
              aria-label="Career leaderboard minimum participation"
              value={minimum}
              onChange={(e) => setMinimum(Number(e.target.value))}
            >
              {[1, 14, 28].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
        </div>
        <DataTable
          key={metric}
          rows={rows}
          rowKey={(r) => r.manager}
          initialSort={metric}
          columns={[
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => <ManagerName username={r.manager} />,
            },
            {
              key: "games",
              label: "GAMES",
              value: (r) => r.games,
              numeric: true,
            },
            {
              key: "wins",
              label: "OFFICIAL W",
              value: (r) => r.wins,
              numeric: true,
            },
            {
              key: "winRate",
              label: "WIN %",
              value: (r) => r.winRate,
              render: (r) => pct(r.winRate),
              numeric: true,
            },
            {
              key: "points",
              label: "POINTS",
              value: (r) => r.points,
              render: (r) => fmt(r.points),
              numeric: true,
            },
            {
              key: "average",
              label: "AVG SCORE",
              value: (r) => r.average,
              render: (r) => fmt(r.average),
              numeric: true,
            },
            {
              key: "averageGames",
              label: "AVG N",
              value: (r) => r.averageGames,
              numeric: true,
              description: "Scores included in the scoring-average denominator",
            },
            {
              key: "eligibleWeeks",
              label: "AP WEEKS",
              value: (r) => r.eligibleWeeks,
              numeric: true,
            },
            {
              key: "allPlayRate",
              label: "AP %",
              value: (r) => r.allPlayRate,
              render: (r) => pct(r.allPlayRate),
              numeric: true,
            },
            {
              key: "expected",
              label: "EXPECTED W",
              value: (r) => r.expected,
              render: (r) => fmt(r.expected),
              numeric: true,
            },
          ]}
        />
      </Panel>
      <InfoNote>
        Qualification currently requires {minimum}+ {basis}. Rate metrics
        default to 14 observations; totals default to one. Win % = (official
        wins + half of official ties) / games. AP % = (all-play wins + half of
        all-play ties) / (15 × eligible weeks), including zero-score ties. Only
        scoring averages and AVG N respond to the missed-week filter. Expected
        wins require complete 16-score weeks; unavailable values stay unknown.
      </InfoNote>
    </>
  );
}
export function ObservedSelections({
  seasons,
  manager,
}: {
  seasons: Season[];
  manager: string;
}) {
  const count = seasons
    .flatMap((s) => s.lineups)
    .filter((l) => l.manager === manager).length;
  const scored = games(seasons).filter((g) => g.manager === manager).length;
  return (
    <Panel
      title="Observed player selections"
      eyebrow="SELECTED SEASONS / KNOWN LINEUPS ONLY"
      aside={
        <span className="badge">
          {count} / {scored} lineups ·{" "}
          {scored ? pct(count / scored) : "coverage unknown"}
        </span>
      }
    >
      <DataTable
        rows={playerOwnership(seasons, manager)}
        rowKey={(r) => r.key}
        pageSize={15}
        initialSort="selections"
        columns={[
          { key: "name", label: "PLAYER", value: (r) => r.name },
          { key: "position", label: "POS", value: (r) => r.position },
          {
            key: "selections",
            label: "SELECTIONS",
            value: (r) => r.selections,
            numeric: true,
          },
          {
            key: "ownership",
            label: "SELECTION RATE",
            value: (r) => r.ownership,
            render: (r) => pct(r.ownership),
            numeric: true,
          },
          {
            key: "salary",
            label: "AVG SALARY",
            value: (r) => r.salary,
            render: (r) =>
              r.salary == null ? "Unavailable" : `$${fmt(r.salary, 0)}`,
            numeric: true,
          },
        ]}
        emptyText="No detailed player selections in this scope."
      />
      <div className="panel-bottom">
        Selection denominator: {count} imported lineups. Missing lineup detail
        never removes any of the {scored} official scores.
      </div>
    </Panel>
  );
}
