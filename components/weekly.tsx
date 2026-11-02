"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { Season } from "@/lib/schema";
import { completeWeeks } from "@/lib/analytics";
import {
  weeklyWinners,
  weeklyVictoryTable,
  weeklyRecords,
  weeklyRecap,
  standingsThrough,
} from "@/lib/weekly";
import {
  DataTable,
  EmptyState,
  InfoNote,
  ManagerName,
  Metric,
  Panel,
  fmt,
  pct,
} from "./ui";
import { StandingsChart } from "./charts";
const recapUrl = (year: number, week: number) =>
  `/weekly-recap?season=${year}&week=${week}`;
function RecapLink({ year, week }: { year: number; week: number }) {
  return (
    <Link className="text-link" href={recapUrl(year, week)}>
      {year} · Week {week}
    </Link>
  );
}
export function WeeklyWinners({ seasons }: { seasons: Season[] }) {
  const [manager, setManager] = useState("");
  const winners = weeklyWinners(seasons).filter(
    (g) => !manager || g.manager === manager,
  );
  const leaders = weeklyVictoryTable(seasons).filter(
    (r) => !manager || r.manager === manager,
  );
  const records = weeklyRecords(seasons, manager);
  const members = [...new Set(seasons.flatMap((s) => s.members))].sort();
  return (
    <>
      <div className="weekly-controls">
        <label className="select-wrap">
          Manager{" "}
          <select
            aria-label="Weekly winners manager"
            value={manager}
            onChange={(e) => setManager(e.target.value)}
          >
            <option value="">All managers</option>
            {members.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <InfoNote>
        Weekly victories mean the highest score among all 16 participants,
        regardless of opponent. Tied leaders each receive one shared victory;
        their margin is zero. Rates divide victories by complete weeks
        participated, including zeros. Only complete, reconciled regular seasons
        qualify.
      </InfoNote>
      <Panel
        title="Weekly victories leaderboard"
        eyebrow={
          seasons.length === 1 ? "SEASON LEADERS" : "ALL-TIME / 2019–2025"
        }
      >
        <DataTable
          rows={leaders}
          rowKey={(r) => r.manager}
          initialSort="victories"
          columns={[
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => <ManagerName username={r.manager} />,
            },
            {
              key: "victories",
              label: "VICTORIES",
              value: (r) => r.victories,
              numeric: true,
            },
            {
              key: "weeks",
              label: "WEEKS",
              value: (r) => r.weeks,
              numeric: true,
            },
            {
              key: "rate",
              label: "VICTORY RATE",
              value: (r) => r.rate,
              numeric: true,
              render: (r) => pct(r.rate),
            },
            ...seasons.map((s) => ({
              key: String(s.year),
              label: String(s.year),
              numeric: true,
              value: (r: (typeof leaders)[number]) => r.years[s.year] ?? 0,
            })),
          ]}
        />
      </Panel>
      <div className="weekly-records">
        <Panel title="Most victories in a season">
          {records.season.length ? (
            records.season.map((r) => (
              <div className="weekly-record" key={`${r.manager}-${r.year}`}>
                <ManagerName username={r.manager} />
                <strong>
                  {r.victories} victories · {r.year}
                </strong>
              </div>
            ))
          ) : (
            <p>No qualifying victories.</p>
          )}
        </Panel>
        <Panel title="Longest winning streak">
          {records.streak.length ? (
            records.streak.map((r) => (
              <div
                className="weekly-record"
                key={`${r.manager}-${r.year}-${r.week}`}
              >
                <ManagerName username={r.manager} />
                <strong>{r.length} consecutive weeks</strong>
                <RecapLink year={r.year} week={r.week} />
                <span className="muted">
                  Weeks {r.start}–{r.week}
                </span>
              </div>
            ))
          ) : (
            <p>No qualifying streak.</p>
          )}
        </Panel>
        {(
          [
            ["Highest winning score", records.highest],
            ["Lowest winning score", records.lowest],
          ] as const
        ).map(([title, rows]) => (
          <Panel key={title} title={title}>
            {rows.map((r) => (
              <div
                className="weekly-record"
                key={`${r.year}-${r.week}-${r.manager}`}
              >
                <ManagerName username={r.manager} />
                <strong>
                  {fmt(r.score)} points{r.shared ? " · Shared victory" : ""}
                </strong>
                <RecapLink year={r.year} week={r.week} />
              </div>
            ))}
          </Panel>
        ))}
      </div>
      <InfoNote>
        Records respect the season and manager filters. Consecutive streaks
        reset at season boundaries or missing weeks. Every tied record holder is
        shown.
      </InfoNote>
      <Panel
        title="Every weekly winner"
        eyebrow={`${winners.length} VICTORIES / SHARED WINS INCLUDED`}
      >
        <DataTable
          key={manager + seasons.map((s) => s.year).join()}
          rows={winners}
          rowKey={(r) => `${r.year}-${r.week}-${r.manager}`}
          initialSort="date"
          pageSize={20}
          columns={[
            {
              key: "date",
              label: "SEASON / WEEK",
              value: (r) => r.year * 100 + r.week,
              render: (r) => <RecapLink year={r.year} week={r.week} />,
            },
            {
              key: "manager",
              label: "WINNER",
              value: (r) => r.manager,
              render: (r) => (
                <>
                  <ManagerName username={r.manager} />
                  {r.shared && (
                    <span className="micro-tag">
                      Shared victory · {r.coWinners.length} tied
                    </span>
                  )}
                </>
              ),
            },
            {
              key: "score",
              label: "SCORE",
              value: (r) => r.score,
              numeric: true,
              render: (r) => (
                <Link href={`/matchups/${r.id}`}>{fmt(r.score)}</Link>
              ),
            },
            {
              key: "runner",
              label: "RUNNER-UP / OTHER LEADERS",
              value: (r) =>
                (r.shared
                  ? r.coWinners.filter((m) => m !== r.manager)
                  : r.runners.map((g) => g.manager)
                ).join(", "),
              render: (r) => (
                <>
                  {(r.shared
                    ? r.coWinners.filter((m) => m !== r.manager)
                    : r.runners.map((g) => g.manager)
                  ).map((m) => (
                    <div key={m}>
                      <ManagerName username={m} />
                    </div>
                  ))}
                  {!r.shared && r.runners[0] && (
                    <span className="muted">{fmt(r.runners[0].score)} pts</span>
                  )}
                </>
              ),
            },
            {
              key: "margin",
              label: "MARGIN",
              value: (r) => r.margin,
              numeric: true,
              render: (r) => fmt(r.margin),
            },
          ]}
        />
      </Panel>
    </>
  );
}
const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const snapshot = () =>
  new URLSearchParams(window.location.search).get("week") ?? "1";
export function WeeklyRecap({ seasons }: { seasons: Season[] }) {
  const queryWeek = useSyncExternalStore(subscribe, snapshot, () => "1");
  const season = seasons.find(
    (s) => s.status === "complete" && s.verification === "reconciled",
  );
  if (!season) return <EmptyState title="No verified recap available." />;
  return <Recap season={season} requestedWeek={Number(queryWeek)} />;
}
function Recap({
  season,
  requestedWeek,
}: {
  season: Season;
  requestedWeek: number;
}) {
  const weeks = completeWeeks(season);
  const week = weeks.includes(requestedWeek) ? requestedWeek : weeks[0];
  if (!week) return <EmptyState title="No complete week available." />;
  const recap = weeklyRecap(season, week);
  const go = (next: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set("season", String(season.year));
    url.searchParams.set("week", String(next));
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return (
    <>
      <div className="weekly-controls">
        <button
          className="button subtle"
          disabled={week === weeks[0]}
          onClick={() => go(weeks[weeks.indexOf(week) - 1])}
        >
          Previous Week
        </button>
        <label className="select-wrap">
          {season.year} ·{" "}
          <select
            aria-label="Recap week"
            value={week}
            onChange={(e) => go(Number(e.target.value))}
          >
            {weeks.map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button subtle"
          disabled={week === weeks.at(-1)}
          onClick={() => go(weeks[weeks.indexOf(week) + 1])}
        >
          Next Week
        </button>
      </div>
      <InfoNote>
        Recapping {season.year}, Week {week}. With All seasons selected, the
        earliest verified season is shown; choose a season above. Official
        outcomes include automatic losses for zero submissions. No playoffs.
      </InfoNote>
      <div className="metrics-grid">
        <Metric
          label="WEEKLY AVERAGE"
          value={fmt(recap.average)}
          note={`${recap.scoring.length} participants · zeros included`}
        />
        <Metric
          label="TOP SCORE"
          value={fmt(recap.scoring[0]?.score)}
          note="Shared honors for tied scores"
        />
        <Metric
          label="MATCHUPS"
          value={recap.matchups.length}
          note="Official head-to-head outcomes"
        />
        <Metric
          label="SEASON PROGRESS"
          value={`${week} / ${season.regularSeasonWeeks}`}
          note="Regular-season weeks"
        />
      </div>
      <Panel
        title="Weekly headlines"
        eyebrow={`${season.year} / WEEK ${week} / THE SCOREBOARD DESK`}
      >
        <div className="weekly-headlines">
          {recap.headlines.map((h) => (
            <article key={h.title}>
              <h3>{h.title}</h3>
              {h.games.length ? (
                h.games.map((g) => (
                  <p key={g.manager}>
                    <ManagerName username={g.manager} /> scored{" "}
                    <Link className="text-link" href={`/matchups/${g.id}`}>
                      {fmt(g.score)}
                    </Link>{" "}
                    against {g.opponent} ({fmt(g.against)}) · official{" "}
                    {g.result}.
                    {h.games.length > 1 ? " Shared distinction." : ""}
                  </p>
                ))
              ) : (
                <p>No qualifying result this week.</p>
              )}
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Standings movement" eyebrow="WINS FIRST / POINTS SECOND">
        <InfoNote>
          {week === 1
            ? "Opening week: previous rank and movement are unavailable; no Week 0 standings are invented."
            : "Movement is previous rank minus current rank. Exact wins/points ties share a rank."}
        </InfoNote>
        <StandingsChart
          selectedWeek={week}
          managers={season.members}
          data={weeks.map((w) => ({
            week: w,
            ...Object.fromEntries(
              standingsThrough(season, w).map((r) => [r.manager, r.rank]),
            ),
          }))}
        />
        <DataTable
          rows={recap.movement}
          rowKey={(r) => r.manager}
          columns={[
            {
              key: "rank",
              label: "CURRENT",
              value: (r) => r.rank,
              numeric: true,
            },
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => <ManagerName username={r.manager} />,
            },
            {
              key: "previous",
              label: "PREVIOUS",
              value: (r) => r.previous,
              numeric: true,
            },
            {
              key: "movement",
              label: "MOVEMENT",
              value: (r) => r.movement,
              numeric: true,
              render: (r) =>
                r.movement === null
                  ? "Opening week"
                  : r.movement > 0
                    ? `↑ ${r.movement}`
                    : r.movement < 0
                      ? `↓ ${-r.movement}`
                      : "—",
            },
            {
              key: "record",
              label: "W–L–T",
              value: (r) => `${r.wins}–${r.losses}–${r.ties}`,
            },
            {
              key: "points",
              label: "POINTS",
              value: (r) => r.points,
              numeric: true,
              render: (r) => fmt(r.points),
            },
          ]}
        />
      </Panel>
      <Panel title="Weekly scoring leaderboard">
        <DataTable
          rows={recap.scoring}
          rowKey={(r) => r.manager}
          columns={[
            { key: "rank", label: "RANK", value: (r) => r.rank, numeric: true },
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => (
                <>
                  <ManagerName username={r.manager} />
                  {r.rank === 1 && <span className="micro-tag">Highest</span>}
                  {r.score === recap.scoring.at(-1)?.score && (
                    <span className="micro-tag">Lowest</span>
                  )}
                </>
              ),
            },
            {
              key: "score",
              label: "SCORE",
              value: (r) => r.score,
              numeric: true,
              render: (r) => (
                <Link href={`/matchups/${r.id}`}>{fmt(r.score)}</Link>
              ),
            },
            {
              key: "relative",
              label: "VS AVERAGE",
              value: (r) => r.relative,
              numeric: true,
              render: (r) => `${r.relative > 0 ? "+" : ""}${fmt(r.relative)}`,
            },
            { key: "result", label: "OFFICIAL", value: (r) => r.result },
          ]}
        />
      </Panel>
      <Panel title="Matchup results">
        <div className="weekly-matchups">
          {recap.matchups.map((m) => {
            const home = recap.scoring.find(
              (g) => g.manager === m.home.manager,
            )!;
            const away = recap.scoring.find(
              (g) => g.manager === m.away.manager,
            )!;
            const margin = Math.abs(m.home.score - m.away.score);
            const tags = [
              margin > 0 && margin <= 5 ? "Close game · ≤5 pts" : "",
              margin >= 50 ? "Blowout · ≥50 pts" : "",
              [home, away].some((g) => g.result === "L" && g.rank <= 4)
                ? "Unfortunate loss · top-four score"
                : "",
              home.score === 0 && away.score === 0
                ? "Double automatic loss"
                : "",
            ].filter(Boolean);
            return (
              <article key={m.id}>
                {[home, away].map((g) => (
                  <div className="weekly-score" key={g.manager}>
                    <ManagerName username={g.manager} />
                    <span>
                      #{g.rank} · <strong>{fmt(g.score)}</strong> · {g.result}
                    </span>
                  </div>
                ))}
                <p className="muted">
                  Score gap: {fmt(margin)}
                  {tags.map((t) => (
                    <span className="micro-tag" key={t}>
                      {t}
                    </span>
                  ))}
                </p>
                <Link className="text-link" href={`/matchups/${m.id}`}>
                  Matchup receipt ↗
                </Link>
              </article>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Weekly awards"
        eyebrow="DETERMINISTIC / ALL TIED HOLDERS INCLUDED"
      >
        <div className="weekly-awards">
          {recap.awards.map((a) => (
            <article key={a.title}>
              <h3>{a.title}</h3>
              <p className="muted">{a.detail}</p>
              {a.winners.length > 1 && (
                <span className="micro-tag">Shared award</span>
              )}
              {a.winners.length ? (
                a.winners.map((g) => (
                  <div key={g.manager}>
                    <ManagerName username={g.manager} />
                    {"score" in g && typeof g.score === "number" && (
                      <span> · {fmt(g.score)} pts</span>
                    )}
                    {"rank" in g &&
                      typeof g.rank === "number" &&
                      "score" in g && <span> · weekly rank #{g.rank}</span>}
                    {"against" in g &&
                      typeof g.against === "number" &&
                      "score" in g &&
                      typeof g.score === "number" &&
                      (a.title === "Public Execution" ||
                        a.title === "Photo Finish") && (
                        <span> · {fmt(g.score - g.against)}-point margin</span>
                      )}
                    {"movement" in g && typeof g.movement === "number" && (
                      <span>
                        {" "}
                        · #{g.previous} → #{g.rank} ({g.movement > 0 ? "+" : ""}
                        {g.movement} places)
                      </span>
                    )}
                    {"id" in g && typeof g.id === "string" && (
                      <Link className="text-link" href={`/matchups/${g.id}`}>
                        {" "}
                        Receipt
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <p>No qualifying recipient.</p>
              )}
            </article>
          ))}
        </div>
      </Panel>
    </>
  );
}
