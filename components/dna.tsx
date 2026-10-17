"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Dna, Search } from "lucide-react";
import type { Season } from "@/lib/schema";
import {
  coverageRows,
  coverageSummary,
  lineupOverlap,
  lineupStrategies,
  playerOwnership,
  positionalTrends,
  unknownSelections,
} from "@/lib/dna";
import {
  DataTable,
  fmt,
  InfoNote,
  ManagerName,
  Metric,
  Panel,
  pct,
} from "./ui";
import { DnaFlexChart } from "./charts";
import { useHydrated } from "./use-hydrated";
const emptyDescription =
  "No observed selections match this view. Missing data is never filled with invented picks.";
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="select-wrap">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </label>
  );
}
export default function DNA({ seasons }: { seasons: Season[] }) {
  const hydrated = useHydrated();
  const [manager, setManager] = useState("all"),
    [week, setWeek] = useState("all");
  const [query, setQuery] = useState(""),
    [position, setPosition] = useState("all"),
    [slot, setSlot] = useState("all");
  const [grouping, setGrouping] = useState("season");
  const members = [...new Set(seasons.flatMap((s) => s.members))].sort();
  const activeManager = members.includes(manager) ? manager : "all";
  const activeWeek = seasons.some(
    (s) => (s.regularSeasonWeeks ?? 0) >= Number(week),
  )
    ? week
    : "all";
  const selectedManager = activeManager === "all" ? undefined : activeManager;
  const scoped = seasons.map((s) => ({
    ...s,
    matchups: s.matchups.filter(
      (m) => activeWeek === "all" || m.week === Number(activeWeek),
    ),
    lineups: s.lineups.filter(
      (l) => activeWeek === "all" || l.week === Number(activeWeek),
    ),
  }));
  const coverage = coverageSummary(scoped, selectedManager),
    strategy = lineupStrategies(scoped, selectedManager);
  const players = playerOwnership(scoped, selectedManager, {
    position: position === "all" ? undefined : position,
    slot: slot === "all" ? undefined : slot,
  }).filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const trends = positionalTrends(scoped, selectedManager);
  const unknown = unknownSelections(scoped, selectedManager);
  const flex = scoped.flatMap((s) => {
    const t = lineupStrategies([s], selectedManager);
    return t
      ? [
          {
            year: s.year,
            lineups: t.count,
            RB:
              (t.flex.find((f) => f.position === "RB")!.count / t.count) * 100,
            WR:
              (t.flex.find((f) => f.position === "WR")!.count / t.count) * 100,
            TE:
              (t.flex.find((f) => f.position === "TE")!.count / t.count) * 100,
            Unknown:
              (t.flex.find((f) => f.position === "Unknown")!.count / t.count) *
              100,
          },
        ]
      : [];
  });
  const coverageGroups = new Map<
    string,
    {
      key: string;
      period: string;
      manager: string | null;
      observed: number;
      official: number;
      missing: number;
      unknown: number;
    }
  >();
  for (const r of coverageRows(scoped, selectedManager)) {
    const key =
      grouping === "season"
        ? String(r.year)
        : grouping === "manager"
          ? r.manager
          : `${r.year}-${r.manager}`;
    const row = coverageGroups.get(key) ?? {
      key,
      period: grouping === "manager" ? "Selected seasons" : String(r.year),
      manager: grouping === "season" ? null : r.manager,
      observed: 0,
      official: 0,
      missing: 0,
      unknown: 0,
    };
    row.observed += r.observed;
    row.official += r.official;
    row.missing += r.missing;
    row.unknown += r.unknown;
    coverageGroups.set(key, row);
  }
  return (
    <fieldset
      className="dna-content"
      aria-label="DraftKings DNA analytics"
      disabled={!hydrated}
    >
      <div className="editorial-callout">
        <Dna size={34} />
        <div>
          <span className="eyebrow">YOUR LINEUPS HAVE A TYPE</span>
          <h2>Nine selections. A very specific personality.</h2>
          <p>
            Favorite players, repeat picks, and shared-slate overlap. Real
            selections only. Raw player names are labels, not verified global
            player identities.
          </p>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>The lineup fingerprint.</h2>
          <p className="muted">
            Season, manager and week scope apply to the selection panels.
            Comparisons have their own manager selectors.
          </p>
        </div>
        <div className="dna-controls">
          <Select
            label="Filter lineup analytics by manager"
            value={activeManager}
            onChange={setManager}
            options={[
              { value: "all", label: "All managers" },
              ...members.map((m) => ({ value: m, label: m })),
            ]}
          />
          <Select
            label="DNA week"
            value={activeWeek}
            onChange={setWeek}
            options={[
              { value: "all", label: "All weeks" },
              ...Array.from(
                {
                  length: Math.max(
                    ...seasons.map((s) => s.regularSeasonWeeks ?? 0),
                  ),
                },
                (_, i) => ({ value: String(i + 1), label: `Week ${i + 1}` }),
              ),
            ]}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="VERIFIED LINEUPS"
          value={coverage.observed.toLocaleString("en-US")}
          note={`${coverage.official} official scores in selected scope`}
        />
        <Metric
          label="LINEUP COVERAGE"
          value={pct(coverage.coverage)}
          note={`${coverage.observed} / ${coverage.official} official manager-weeks`}
        />
        <Metric
          label="UNAVAILABLE LINEUPS"
          value={coverage.missing}
          note="Missing detail does not imply a missed submission"
        />
        <Metric
          label="UNKNOWN FLEX POSITIONS"
          value={coverage.unknown}
          note="Selections retained; positions remain unknown"
        />
      </div>
      <InfoNote>
        Salary utilization:{" "}
        {strategy?.averageSalary == null
          ? "unavailable — verified salaries have not been supplied"
          : `$${fmt(strategy.averageSalary, 0)} across ${strategy.salaryLineups} complete-salary lineups`}
        . QB/pass-catcher stacking:{" "}
        {strategy?.stackRate == null
          ? "unavailable — verified NFL-team data is missing"
          : `${pct(strategy.stackRate)} across ${strategy.teamLineups} enriched lineups`}
        . No player IDs, teams, salaries, or positions are guessed.
      </InfoNote>
      <Panel
        title="The usual suspects"
        eyebrow="FAVORITE NFL PLAYERS / EXACT SOURCE LABELS"
        aside={<Dna size={19} />}
      >
        <div className="table-toolbar dna-toolbar">
          <label className="inline-search">
            <Search size={15} />
            <input
              aria-label="Filter players"
              placeholder="Search NFL player labels…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <Select
            label="DNA position"
            value={position}
            onChange={setPosition}
            options={[
              { value: "all", label: "All positions" },
              ...["QB", "RB", "WR", "TE", "DST", "Unknown"].map((p) => ({
                value: p,
                label: p,
              })),
            ]}
          />
          <Select
            label="DNA roster slot"
            value={slot}
            onChange={setSlot}
            options={[
              { value: "all", label: "All roster slots" },
              ...["QB", "RB", "WR", "TE", "FLEX", "DST"].map((p) => ({
                value: p,
                label: p,
              })),
            ]}
          />
        </div>
        <DataTable
          key={`${activeManager}-${activeWeek}-${position}-${slot}-${query}`}
          pageSize={15}
          rows={players}
          rowKey={(p) => p.key}
          initialSort="selections"
          emptyDescription={emptyDescription}
          emptyText="No observed players match these filters."
          columns={[
            { key: "name", label: "PLAYER LABEL", value: (p) => p.name },
            {
              key: "position",
              label: "OBSERVED POS",
              value: (p) => p.position,
            },
            {
              key: "selections",
              label: "PICKS",
              value: (p) => p.selections,
              numeric: true,
            },
            {
              key: "ownership",
              label: "LINEUP SELECTION RATE",
              value: (p) => p.ownership,
              render: (p) => pct(p.ownership),
              numeric: true,
            },
            {
              key: "repeatPicks",
              label: "REPEAT PICKS",
              value: (p) => p.repeatPicks,
              numeric: true,
              description:
                "Within each manager, appearances after that manager’s first pick in the selected scope; not necessarily consecutive",
            },
            {
              key: "managers",
              label: "MANAGERS",
              value: (p) => p.managers,
              numeric: true,
            },
          ]}
        />
        <div className="panel-bottom">
          Denominator: {coverage.observed} observed nine-selection lineups,
          including under position/slot search filters. Repeat picks count each
          manager’s appearances after their first in this scope. No ordering or
          salary rank is implied by RB1/WR1 slot labels.
        </div>
      </Panel>
      <Panel
        title="The FLEX philosophy"
        eyebrow="POSITION SHARES / UNKNOWN IS ITS OWN CATEGORY"
      >
        <DnaFlexChart data={flex} />
        <div className="panel-bottom">
          One FLEX per observed lineup. Unknown positions stay in the
          denominator.
        </div>
      </Panel>
      <Panel
        title="Positional selection trends"
        eyebrow="ALL NINE SELECTIONS / BY SEASON"
      >
        <DataTable
          key={`${activeManager}-${activeWeek}-${seasons.map((s) => s.year).join()}`}
          rows={trends}
          pageSize={14}
          rowKey={(r) => `${r.year}-${r.position}`}
          emptyDescription={emptyDescription}
          columns={[
            { key: "year", label: "SEASON", value: (r) => r.year },
            { key: "position", label: "POSITION", value: (r) => r.position },
            {
              key: "count",
              label: "SELECTIONS",
              value: (r) => r.count,
              numeric: true,
            },
            {
              key: "lineups",
              label: "LINEUPS N",
              value: (r) => r.lineups,
              numeric: true,
            },
            {
              key: "perLineup",
              label: "PICKS / LINEUP",
              value: (r) => r.perLineup,
              render: (r) => fmt(r.perLineup),
              numeric: true,
            },
            {
              key: "share",
              label: "SHARE OF 9 × N",
              value: (r) => r.share,
              render: (r) => pct(r.share),
              numeric: true,
            },
          ]}
        />
      </Panel>
      <Panel
        title="Coverage, with the denominator"
        eyebrow="ALL OFFICIAL SCORES / INCLUDING ZERO SUBMISSIONS"
        aside={
          <Select
            label="Coverage grouping"
            value={grouping}
            onChange={setGrouping}
            options={[
              { value: "season", label: "By season" },
              { value: "manager", label: "By manager" },
              { value: "manager-season", label: "By manager and season" },
            ]}
          />
        }
      >
        <DataTable
          key={`${grouping}-${activeManager}-${activeWeek}-${seasons.map((s) => s.year).join()}`}
          rows={[...coverageGroups.values()]}
          pageSize={14}
          rowKey={(r) => r.key}
          emptyDescription={emptyDescription}
          columns={[
            { key: "period", label: "SEASON SCOPE", value: (r) => r.period },
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager ?? "Selected managers",
              render: (r) =>
                r.manager ? (
                  <ManagerName username={r.manager} />
                ) : (
                  "Selected managers"
                ),
            },
            {
              key: "observed",
              label: "OBSERVED",
              value: (r) => r.observed,
              numeric: true,
            },
            {
              key: "official",
              label: "OFFICIAL N",
              value: (r) => r.official,
              numeric: true,
            },
            {
              key: "missing",
              label: "MISSING",
              value: (r) => r.missing,
              numeric: true,
            },
            {
              key: "coverage",
              label: "COVERAGE",
              value: (r) => (r.official ? r.observed / r.official : null),
              render: (r) => pct(r.official ? r.observed / r.official : null),
              numeric: true,
            },
            {
              key: "unknown",
              label: "UNKNOWN FLEX",
              value: (r) => r.unknown,
              numeric: true,
            },
          ]}
        />
      </Panel>
      <DNAComparison seasons={scoped} />
      <Panel
        title="The unresolved position file"
        eyebrow="VERIFIED PLAYER SELECTION / UNKNOWN FLEX POSITION"
      >
        <DataTable
          rows={unknown}
          pageSize={10}
          rowKey={(r) => `${r.year}-${r.week}-${r.manager}`}
          emptyText="No unresolved positions in this manager/season/week scope."
          emptyDescription="Unknown positions stay null until reliable eligibility evidence is supplied."
          columns={[
            { key: "year", label: "SEASON", value: (r) => r.year },
            { key: "week", label: "WEEK", value: (r) => r.week, numeric: true },
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => <ManagerName username={r.manager} />,
            },
            { key: "name", label: "PLAYER LABEL", value: (r) => r.name },
            {
              key: "position",
              label: "POSITION",
              value: () => "Unknown (FLEX)",
            },
            {
              key: "receipt",
              label: "RECEIPT",
              value: (r) => r.matchupId,
              render: (r) =>
                r.matchupId ? (
                  <Link className="text-link" href={`/matchups/${r.matchupId}`}>
                    Source selections <ArrowUpRight size={12} />
                  </Link>
                ) : (
                  "Unavailable"
                ),
            },
          ]}
        />
      </Panel>
      <InfoNote>
        Player analytics group exact source labels when stable player IDs are
        absent. Same-name players may be conflated; spelling variants remain
        separate. Selection rate is among observed league lineups, never
        contest-wide ownership. Missing selections are unknown, never empty or
        zero lineups. The original official scores and results remain
        authoritative.
      </InfoNote>
    </fieldset>
  );
}
function DNAComparison({ seasons }: { seasons: Season[] }) {
  const members = [...new Set(seasons.flatMap((s) => s.members))].sort();
  const [a, setA] = useState(""),
    [b, setB] = useState(""),
    [query, setQuery] = useState("");
  const first = members.includes(a) ? a : (members[0] ?? "");
  const second =
    members.includes(b) && b !== first
      ? b
      : (members.find((m) => m !== first) ?? "");
  const overlap = lineupOverlap(seasons, first, second),
    ca = coverageSummary(seasons, first),
    cb = coverageSummary(seasons, second);
  const pa = playerOwnership(seasons, first),
    pb = playerOwnership(seasons, second);
  const map = new Map([...pa, ...pb].map((p) => [p.key, p.name]));
  const ma = new Map(pa.map((p) => [p.key, p])),
    mb = new Map(pb.map((p) => [p.key, p]));
  const favorites = [...map]
    .filter(([, name]) => name.toLowerCase().includes(query.toLowerCase()))
    .map(([key, name]) => ({
      key,
      name,
      a: ma.get(key)?.selections ?? 0,
      b: mb.get(key)?.selections ?? 0,
      rateA: ca.observed ? (ma.get(key)?.selections ?? 0) / ca.observed : null,
      rateB: cb.observed ? (mb.get(key)?.selections ?? 0) / cb.observed : null,
    }));
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Same slate. Different convictions.</h2>
          <p className="muted">
            Choose two managers. The global season and DNA week filters apply;
            the single-manager player filter does not.
          </p>
        </div>
        <div className="dna-controls">
          <Select
            label="DNA comparison first manager"
            value={first}
            onChange={setA}
            options={members.map((m) => ({ value: m, label: m }))}
          />
          <Select
            label="DNA comparison second manager"
            value={second}
            onChange={setB}
            options={members
              .filter((m) => m !== first)
              .map((m) => ({ value: m, label: m }))}
          />
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label={`${first || "FIRST MANAGER"} COVERAGE`}
          value={pct(ca.coverage)}
          note={`${ca.observed} observed / ${ca.official} official`}
        />
        <Metric
          label={`${second || "SECOND MANAGER"} COVERAGE`}
          value={pct(cb.coverage)}
          note={`${cb.observed} observed / ${cb.official} official`}
        />
        <Metric
          label="PAIRED LINEUP WEEKS"
          value={overlap.rows.length}
          note={`${overlap.officialWeeks} weeks with both official scores`}
        />
        <Metric
          label="AVERAGE SHARED PICKS"
          value={
            overlap.averageShared === null
              ? "—"
              : `${fmt(overlap.averageShared)} / 9`
          }
          note={`${overlap.rows.length} paired observed slates; missing pairs excluded`}
        />
      </div>
      <Panel
        title="Whose favorite is whose?"
        eyebrow="SELECTION RATES / EACH MANAGER’S OWN OBSERVED DENOMINATOR"
      >
        <div className="table-toolbar">
          <label className="inline-search">
            <Search size={15} />
            <input
              aria-label="Compare player labels"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a shared obsession…"
            />
          </label>
        </div>
        <DataTable
          key={`${first}-${second}-${query}-${seasons.map((s) => `${s.year}:${s.lineups.length}`).join()}`}
          rows={favorites}
          rowKey={(r) => r.key}
          pageSize={10}
          initialSort="a"
          emptyDescription={emptyDescription}
          columns={[
            { key: "name", label: "PLAYER LABEL", value: (r) => r.name },
            {
              key: "a",
              label: `${first} PICKS`,
              value: (r) => r.a,
              numeric: true,
            },
            {
              key: "rateA",
              label: `${first} RATE`,
              value: (r) => r.rateA,
              render: (r) => pct(r.rateA),
              numeric: true,
            },
            {
              key: "b",
              label: `${second} PICKS`,
              value: (r) => r.b,
              numeric: true,
            },
            {
              key: "rateB",
              label: `${second} RATE`,
              value: (r) => r.rateB,
              render: (r) => pct(r.rateB),
              numeric: true,
            },
          ]}
        />
        <div className="panel-bottom">
          {first}: n={ca.observed} observed lineups. {second}: n={cb.observed}.
          Favorites use each manager’s full selected sample, even when the other
          manager’s lineup is absent.
        </div>
      </Panel>
      <Panel
        title="The lineup overlap receipts"
        eyebrow="SAME SEASON + SAME WEEK / NOT LIMITED TO HEAD-TO-HEAD OPPONENTS"
      >
        <DataTable
          key={`${first}-${second}-${seasons.map((s) => `${s.year}:${s.lineups.length}`).join()}`}
          rows={overlap.rows}
          pageSize={10}
          rowKey={(r) => `${r.year}-${r.week}`}
          emptyDescription="Both managers need observed nine-selection lineups in the same week. Missing pairs never become zero overlap."
          columns={[
            { key: "year", label: "SEASON", value: (r) => r.year },
            { key: "week", label: "WEEK", value: (r) => r.week, numeric: true },
            {
              key: "shared",
              label: "SHARED / 9",
              value: (r) => r.shared,
              numeric: true,
            },
            {
              key: "share",
              label: "SHARED SHARE",
              value: (r) => r.share,
              render: (r) => pct(r.share),
              numeric: true,
            },
            {
              key: "jaccard",
              label: "JACCARD",
              value: (r) => r.jaccard,
              render: (r) => pct(r.jaccard),
              numeric: true,
            },
            {
              key: "common",
              label: "SHARED LABELS",
              value: (r) => r.common,
              render: (r) => <span className="wrap-cell">{r.common}</span>,
            },
            {
              key: "receipt",
              label: "RECEIPTS",
              value: (r) => r.firstMatchup,
              render: (r) => (
                <span className="receipt-links">
                  {r.firstMatchup && (
                    <Link
                      className="text-link"
                      href={`/matchups/${r.firstMatchup}`}
                    >
                      First lineup <ArrowUpRight size={12} />
                    </Link>
                  )}
                  {r.secondMatchup && (
                    <Link
                      className="text-link"
                      href={`/matchups/${r.secondMatchup}`}
                    >
                      Second lineup <ArrowUpRight size={12} />
                    </Link>
                  )}
                </span>
              ),
            },
          ]}
        />
        <div className="panel-bottom">
          Shared share = common labels / 9. Jaccard = common labels / (18 −
          common labels). Slot order and uncertain positions never change
          overlap. Unknown-name identity caveats apply.
        </div>
      </Panel>
    </>
  );
}
