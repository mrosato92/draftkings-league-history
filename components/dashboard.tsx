"use client";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  Archive,
  Asterisk,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  Dna,
  Flame,
  FlaskConical,
  Grid2X2,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
  Medal,
  type LucideIcon,
} from "lucide-react";
import type { League, Season } from "@/lib/schema";
import { YEARS } from "@/lib/schema";
import {
  completeWeeks,
  games,
  lineupStrategies,
  longestStreak,
  luckTable,
  matchupById,
  playerOwnership,
  records,
  rivalry,
  scoringHistory,
  standings,
  type Game,
  type Standing,
} from "@/lib/analytics";
import { sections, type SectionId } from "@/lib/navigation";
import {
  AverageToggle,
  DataTable,
  EmptyState,
  fmt,
  InfoNote,
  ManagerName,
  Metric,
  Panel,
  pct,
  SectionLink,
  type Column,
} from "./ui";
import { LuckChart, ScoringChart } from "./charts";
import { Leaderboards, ObservedSelections } from "./leaderboards";
const icons: Record<string, LucideIcon> = {
  home: Grid2X2,
  users: Users,
  trophy: Trophy,
  swords: Swords,
  flask: FlaskConical,
  archive: Archive,
  dna: Dna,
  medal: Medal,
};
const managerColumns: Column<Standing>[] = [
  {
    key: "rank",
    label: "#",
    value: (r) => r.rank,
    render: (r) => (
      <span className="rank">{String(r.rank).padStart(2, "0")}</span>
    ),
  },
  {
    key: "manager",
    label: "MANAGER",
    value: (r) => r.manager,
    render: (r) => <ManagerName username={r.manager} />,
  },
  { key: "games", label: "GAMES", value: (r) => r.games, numeric: true },
  {
    key: "averageGames",
    label: "AVG N",
    value: (r) => r.averageGames,
    numeric: true,
    description: "Scores included in the scoring average",
  },
  { key: "wins", label: "W", value: (r) => r.wins, numeric: true },
  { key: "losses", label: "L", value: (r) => r.losses, numeric: true },
  { key: "ties", label: "T", value: (r) => r.ties, numeric: true },
  {
    key: "points",
    label: "POINTS FOR",
    value: (r) => r.points,
    render: (r) => fmt(r.points),
    numeric: true,
  },
  {
    key: "average",
    label: "AVG / WK",
    value: (r) => r.average,
    render: (r) => fmt(r.average),
    numeric: true,
  },
  {
    key: "winRate",
    label: "WIN %",
    value: (r) => r.winRate,
    render: (r) => pct(r.winRate),
    numeric: true,
  },
];
function subscribeSeason(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener("archive-filter", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("archive-filter", onChange);
  };
}
function seasonSnapshot() {
  const value = new URLSearchParams(window.location.search).get("season");
  return value && YEARS.some((y) => String(y) === value) ? value : "all";
}
function setSeasonFilter(value: string) {
  const url = new URL(window.location.href);
  if (value === "all") url.searchParams.delete("season");
  else url.searchParams.set("season", value);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("archive-filter"));
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function Dashboard({
  league,
  section,
  username,
  matchId,
}: {
  league: League;
  section: SectionId;
  username?: string;
  matchId?: string;
}) {
  const year = useSyncExternalStore(
    subscribeSeason,
    seasonSnapshot,
    () => "all",
  );
  const setYear = setSeasonFilter;
  const [excludeZeros, setExcludeZeros] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<"search" | "data" | "rules" | null>(null);
  const [search, setSearch] = useState("");
  const selected =
    year === "all"
      ? league.seasons
      : league.seasons.filter((s) => s.year === Number(year));
  const nav = sections.find((s) => s.id === section)!;
  const count = league.seasons.reduce((n, s) => n + s.matchups.length, 0);
  const allPending = league.seasons.every((s) => s.status === "pending");
  const allComplete = league.seasons.every((s) => s.status === "complete");
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal((m) => (m === "search" ? null : "search"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          onClick={() => setMobileNav(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        id="main-navigation"
        className={`sidebar ${mobileNav ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <Link className="brand" href="/" onClick={() => setMobileNav(false)}>
          <span className="brand-mark">
            L<ArrowUpRight size={18} strokeWidth={3} />
          </span>
          <span>
            THE LEAGUE
            <span>
              ARCHIVE<span className="brand-dot">.</span>
            </span>
          </span>
        </Link>
        <div className="league-tag">
          <span className="status-dot" /> DRAFTKINGS · EST. 2019
        </div>
        <div className="nav-label">THE CLUBHOUSE</div>
        <nav>
          {sections.map((s) => {
            const Icon = icons[s.icon];
            return (
              <Link
                onClick={() => setMobileNav(false)}
                aria-current={section === s.id ? "page" : undefined}
                className={`nav-item ${section === s.id ? "active" : ""}`}
                href={`/${s.id}`}
                key={s.id}
              >
                <Icon size={18} strokeWidth={1.7} />
                <span>{s.label}</span>
                {section === s.id && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="eyebrow">THE FINE PRINT</span>
            <p>
              Friends on Sunday.
              <br />
              Evidence for eternity.
            </p>
            <button onClick={() => setModal("rules")}>
              League rules <ArrowUpRight size={13} />
            </button>
          </div>
          <button className="sidebar-data" onClick={() => setModal("data")}>
            <span className="data-icon">
              <Database size={16} />
            </span>
            <span>
              Archive status
              <small>
                {allPending
                  ? "Awaiting historical data"
                  : allComplete
                    ? "All seasons complete"
                    : "Partial data imported"}
              </small>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
              aria-controls="main-navigation"
              aria-expanded={mobileNav}
            >
              <Menu size={20} />
            </button>
            <span>The League Archive</span>
            <span className="slash">/</span>
            <strong>{nav.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => {
                setSearch("");
                setModal("search");
              }}
            >
              <Search size={15} />
              <span>Search the archive</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <span className="regular-tag">
              <span /> REGULAR SEASON
            </span>
            <button
              className="icon-button help-button"
              title="Rules & methodology"
              onClick={() => setModal("rules")}
              aria-label="Rules and methodology"
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="orange-dash" />{" "}
                {section === ""
                  ? "YOUR LEAGUE. THE WHOLE STORY."
                  : "THE LEAGUE ARCHIVE / ANALYTICS"}
              </div>
              <h1>
                {username ?? nav.label}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {username
                  ? "Career receipts. Every season. Every Sunday."
                  : nav.description}
              </p>
            </div>
            <div className="heading-controls">
              <label className="select-wrap">
                <Layers size={14} />
                <span className="sr-only">Season filter</span>
                <select
                  aria-label="Season filter"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                >
                  <option value="all">All seasons</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} season
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
              <button
                className="button subtle"
                onClick={() => setModal("rules")}
              >
                <SlidersHorizontal size={14} /> Methodology
              </button>
            </div>
          </div>
          <div className="data-banner">
            <div>
              <span className={`status-dot ${allPending ? "amber" : ""}`} />
              <span>
                <strong>
                  {allPending
                    ? "The archive is taking shape."
                    : "Built from imported scorecards."}
                </strong>{" "}
                {allPending
                  ? "Historical results are awaiting import. Every stat here will be earned."
                  : `${count} official-score matchups imported. ${allComplete ? "All seven regular seasons are complete." : "Results are provisional while imports are incomplete."}`}
              </span>
            </div>
            <button onClick={() => setModal("data")}>
              Data status <ArrowUpRight size={14} />
            </button>
          </div>
          {section === "" && (
            <Overview
              seasons={selected}
              league={league}
              excludeZeros={excludeZeros}
              setExcludeZeros={setExcludeZeros}
            />
          )}
          {section === "managers" && (
            <Managers
              seasons={selected}
              league={league}
              username={username}
              excludeZeros={excludeZeros}
              setExcludeZeros={setExcludeZeros}
            />
          )}
          {section === "leaderboards" && (
            <Leaderboards
              seasons={selected}
              excludeZeros={excludeZeros}
              setExcludeZeros={setExcludeZeros}
            />
          )}
          {section === "compare" && (
            <Rivalries
              seasons={selected}
              comparison
              excludeZeros={excludeZeros}
              setExcludeZeros={setExcludeZeros}
            />
          )}
          {section === "records" && <RecordBook seasons={selected} />}
          {section === "rivalries" && <Rivalries seasons={selected} />}
          {section === "luck" && <Luck seasons={selected} />}
          {section === "seasons" && (
            <SeasonArchive
              seasons={selected}
              league={league}
              excludeZeros={excludeZeros}
              setExcludeZeros={setExcludeZeros}
              matchId={matchId}
            />
          )}
          {section === "dna" && <DNA seasons={selected} />}
          {section === "hall-of-fame" && <Hall seasons={selected} />}
          <footer className="footer">
            <Link href="/" className="footer-logo">
              THE LEAGUE ARCHIVE<span>.</span>
            </Link>
            <span>
              2019–2025 <span className="footer-cross">×</span> Regular season
              only <span className="footer-cross">×</span> All receipts, no
              revisionism.
            </span>
            <button onClick={() => setModal("rules")}>
              How we count <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      {modal === "search" && (
        <Dialog title="Search the archive" onClose={() => setModal(null)}>
          <div className="search-field">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Search pages and usernames"
              placeholder="Pages, managers, old grudges…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="search-results">
            {sections
              .filter((s) =>
                `${s.label} ${s.description}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((s) => (
                <Link
                  key={s.id}
                  href={`/${s.id}`}
                  onClick={() => setModal(null)}
                >
                  <span>
                    {s.label}
                    <small>{s.description}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            {league.managers
              .filter((m) =>
                m.username.toLowerCase().includes(search.toLowerCase()),
              )
              .map((m) => (
                <Link
                  key={m.username}
                  href={`/managers/${encodeURIComponent(m.username)}`}
                  onClick={() => setModal(null)}
                >
                  <span>
                    {m.username}
                    <small>Manager profile</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            {!sections.some((s) =>
              `${s.label} ${s.description}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ) &&
              !league.managers.some((m) =>
                m.username.toLowerCase().includes(search.toLowerCase()),
              ) && (
                <p className="muted p-5">
                  No matching pages or imported usernames.
                </p>
              )}
          </div>
          <div className="dialog-foot">
            Search public usernames and archive sections. Press Esc to close.
          </div>
        </Dialog>
      )}
      {modal === "data" && (
        <Dialog
          title="An archive with standards."
          onClose={() => setModal(null)}
        >
          <div className="dialog-body">
            <p>
              Only verified regular-season scores belong here. Pending files
              contain season metadata, not fictional results.
            </p>
            <div className="status-list">
              {league.seasons.map((s) => (
                <div key={s.year}>
                  <strong>{s.year}</strong>
                  <span>
                    {s.matchups.length} matchups · {s.lineups.length} lineups ·{" "}
                    {s.verification}
                  </span>
                  <span
                    className={`badge ${s.status === "complete" ? "green" : ""}`}
                  >
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <InfoNote>
              Data lives in data/managers.json and data/seasons/2019.json
              through 2025.json. Import instructions: docs/DATA.md in the
              repository. No contacts or private source documents are published.
            </InfoNote>
          </div>
        </Dialog>
      )}
      {modal === "rules" && (
        <Dialog
          title="The fine print. Actually useful."
          onClose={() => setModal(null)}
        >
          <div className="dialog-body rules">
            <h3>The format</h3>
            <p>
              16 teams per season. Head-to-head DraftKings NFL Classic, the same
              slate, a $50,000 salary cap, and nine roster selections.
              Membership can change by season; identities always use permanent
              DraftKings usernames.
            </p>
            <h3>The standings</h3>
            <p>
              Ranked by wins, then total points scored. Zero-point weeks are
              missed submissions and automatic losses—even when both opponents
              score zero. Official W/L/T is imported explicitly from the source.
              Equal nonzero scores without a verified resolution stay
              unimported; no tiebreaker is invented. Win percentage counts a tie
              as half a win.
            </p>
            <h3>The averages</h3>
            <p>
              Zeros count in all official results. The “Exclude missed weeks”
              switch changes scoring averages only. It never changes standings,
              total points, games played, records, or luck calculations. Missing
              data is unknown, never zero.
            </p>
            <h3>The luck math</h3>
            <p>
              Each manager is compared with the other 15 scores in a fully
              imported week. Expected wins = (all-play wins + half of all-play
              ties) ÷ 15, summed across eligible weeks. Luck = official wins −
              expected wins, using the same weeks. All-play compares numerical
              scores: two zero scores tie here, while both remain official
              losses.
            </p>
            <h3>The boundaries</h3>
            <p>
              2019–2025, regular season only: 14 or 15 confirmed weeks per
              season. Partial imports are labeled. Records publish only from
              complete seasons marked reconciled against official source results
              and standings. Tied records share credit. Lineup analytics use
              available detailed lineups only; official scores without
              selections remain in every scoring statistic. Ownership means
              selection rate among imported league lineups, never contest-wide
              ownership.
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
function Overview({
  seasons,
  league,
  excludeZeros,
  setExcludeZeros,
}: {
  seasons: Season[];
  league: League;
  excludeZeros: boolean;
  setExcludeZeros: (v: boolean) => void;
}) {
  const [leaderTab, setLeaderTab] = useState("wins");
  const [minimumGames, setMinimumGames] = useState(1);
  const rows = standings(seasons, excludeZeros);
  const hasScores = games(seasons).length > 0;
  const recordList = records(seasons);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span /> THE UNOFFICIAL OFFICIAL HISTORY
          </span>
          <h2>
            Seven seasons.
            <br />
            Countless grudges.
            <br />
            <em>All the receipts.</em>
          </h2>
          <p>
            The wins. The heartbreak. The lineup you still bring up.
            <br className="desktop-break" /> Your league’s entire story, finally
            in one place.
          </p>
          <Link className="button primary" href="/seasons">
            Explore the archive <ArrowUpRight size={16} />
          </Link>
          <span className="hero-caption">
            2019—2025 <span /> 16 TEAMS. ZERO EXCUSES.
          </span>
        </div>
        <div
          className="hero-art"
          aria-label="Seven-season archive from 2019 to 2025"
        >
          <div className="art-label">
            <span>THE LONG GAME</span>
            <ArrowUpRight size={22} />
          </div>
          <div className="field-markings" aria-hidden="true">
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>
          <div className="hero-years">
            <span>20</span>
            <span>
              19
              <span className="year-arrow">
                <ArrowUpRight strokeWidth={1.5} />
              </span>
              25
            </span>
          </div>
          <div className="hero-art-bottom">
            <span>SEVEN YEARS IN THE MAKING</span>
            <span className="art-star">
              <Asterisk size={45} strokeWidth={1.4} />
            </span>
          </div>
        </div>
      </section>
      <div className="metrics-grid">
        <Metric
          label="SEASONS IN THE ARCHIVE"
          value="07"
          note="2019 through 2025"
          icon={<Archive size={16} />}
          accent
        />
        <Metric
          label="TEAMS. ONE BRAGGING RIGHT."
          value="16"
          note="League format · membership varies"
          icon={<Users size={16} />}
        />
        <Metric
          label="WEEKS TO MAKE YOUR CASE"
          value="14–15"
          note="Regular season · per year"
          icon={<Clock3 size={16} />}
        />
        <Metric
          label="SAME CAP. DIFFERENT CHAOS."
          value={
            <>
              <span className="metric-dollar">$</span>50,000
            </>
          }
          note="NFL Classic · nine roster spots"
          icon={<Layers size={16} />}
        />
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">THE BIG PICTURE</span>
          <h2>Legacy, by the numbers.</h2>
        </div>
        <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
      </div>
      <div className="overview-grid">
        <Panel
          title="The scoring pulse"
          eyebrow="WEEK BY WEEK"
          aside={
            <span className="chart-legend">
              <span /> League average
            </span>
          }
        >
          <ScoringChart
            data={scoringHistory(seasons, undefined, excludeZeros)}
          />
          <div className="panel-bottom">
            <span>
              {hasScores
                ? "Imported regular-season scores"
                : "Awaiting official weekly scorecards"}
            </span>
            <SectionLink href="/seasons">Weekly results</SectionLink>
          </div>
        </Panel>
        <Panel
          title="The high-water mark"
          eyebrow="RECORD SPOTLIGHT"
          className="spotlight"
          aside={<Trophy size={19} className="orange" />}
        >
          {recordList.length ? (
            <div className="spotlight-record">
              <span className="record-number">{fmt(recordList[0].value)}</span>
              <span className="eyebrow">POINTS IN A SINGLE WEEK</span>
              <ManagerName username={recordList[0].game.manager} />
              <p>
                {recordList[0].game.year} · Week {recordList[0].game.week}
              </p>
              <SectionLink href={`/matchups/${recordList[0].game.id}`}>
                View the matchup
              </SectionLink>
            </div>
          ) : (
            <div className="spotlight-empty">
              <span className="record-number">
                —<span>.—</span>
              </span>
              <span className="eyebrow">HIGHEST WEEKLY SCORE</span>
              <p>
                Someone peaked.
                <br />
                We’re just waiting on the proof.
              </p>
            </div>
          )}
          <div className="panel-bottom">
            <span className="micro-tag">
              {recordList.length
                ? `${seasons.filter((s) => s.verification === "reconciled").length}/${seasons.length} RECONCILED SEASONS`
                : hasScores
                  ? "UNVERIFIED RECORDS WITHHELD"
                  : "UNCLAIMED TERRITORY"}
            </span>
            <SectionLink href="/records">Record book</SectionLink>
          </div>
        </Panel>
      </div>
      <Panel
        title="The career leaderboard"
        eyebrow="LONGEVITY MEETS BRAGGING RIGHTS"
        aside={<SectionLink href="/managers">All managers</SectionLink>}
      >
        <div className="table-toolbar">
          <div className="tabs">
            {[
              { key: "wins", label: "Most wins" },
              { key: "points", label: "Total points" },
              { key: "average", label: "Scoring average" },
            ].map((t) => (
              <button
                key={t.key}
                className={leaderTab === t.key ? "selected" : ""}
                onClick={() => {
                  setLeaderTab(t.key);
                  setMinimumGames(t.key === "average" ? 14 : 1);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="qualification-filter">
            Minimum {leaderTab === "average" ? "included weeks" : "games"}
            <select
              aria-label="Leaderboard minimum participation"
              value={minimumGames}
              onChange={(e) => setMinimumGames(Number(e.target.value))}
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
          key={leaderTab}
          rows={rows.filter(
            (r) =>
              (leaderTab === "average" ? r.averageGames : r.games) >=
              minimumGames,
          )}
          columns={managerColumns}
          initialSort={leaderTab}
          rowKey={(r) => r.manager}
        />
        <div className="panel-bottom">
          <span>
            Official ranks: wins, then points. Rate tab defaults to 14 included
            weeks; totals to 1 game.{" "}
            {seasons.some((s) => s.status !== "complete") &&
              "Import incomplete."}
          </span>
          <ShieldCheck size={14} />
        </div>
      </Panel>
      <div className="section-heading">
        <div>
          <span className="eyebrow">DUST OFF THE SCORECARDS</span>
          <h2>Every season has a story.</h2>
        </div>
        <SectionLink href="/seasons">Season archives</SectionLink>
      </div>
      <div className="season-strip">
        {league.seasons.map((s, i) => (
          <Link
            href={`/seasons?season=${s.year}`}
            className="season-tile"
            key={s.year}
          >
            <div className="season-tile-top">
              <span>SEASON {String(i + 1).padStart(2, "0")}</span>
              <ArrowUpRight size={15} />
            </div>
            <strong>{s.year}</strong>
            <span
              className={`season-state ${s.status === "complete" ? "loaded" : ""}`}
            >
              <span />
              {s.status === "pending"
                ? "Awaiting data"
                : s.status === "partial"
                  ? "Partial archive"
                  : "View season"}
            </span>
          </Link>
        ))}
      </div>
      <div className="discovery-grid">
        <Link className="discovery-card" href="/rivalries">
          <span className="discovery-icon">
            <Swords size={22} />
          </span>
          <div>
            <span className="eyebrow">PERSONAL, BUT STATISTICAL</span>
            <h3>Some matchups mean more.</h3>
            <p>Head-to-head history. Lifelong ammunition.</p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
        <Link className="discovery-card" href="/luck">
          <span className="discovery-icon green">
            <FlaskConical size={22} />
          </span>
          <div>
            <span className="eyebrow">SKILL ISSUE? LET’S CHECK.</span>
            <h3>Blame the schedule. With data.</h3>
            <p>All-play records and the science of bad luck.</p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
      </div>
    </>
  );
}
function Managers({
  seasons,
  league,
  username,
  excludeZeros,
  setExcludeZeros,
}: {
  seasons: Season[];
  league: League;
  username?: string;
  excludeZeros: boolean;
  setExcludeZeros: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [minimumGames, setMinimumGames] = useState(1);
  const rows = standings(seasons, excludeZeros);
  const manager = rows.find((r) => r.manager === username);
  const career = username
    ? standings(league.seasons).find((r) => r.manager === username)
    : null;
  const careerRank = username
    ? standings(league.seasons).find((r) => r.manager === username)?.rank
    : null;
  if (username)
    return (
      <>
        <div className="profile-banner">
          <span className="profile-avatar">
            {username.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <span className="eyebrow">
              DRAFTKINGS USERNAME / PERMANENT IDENTITY
            </span>
            <h2>{username}</h2>
            <p>
              {career?.seasons ?? 0} seasons in the archive · Career standing #
              {career?.games ? careerRank : "—"} (wins, then points)
            </p>
          </div>
          <Link className="button subtle" href="/managers">
            All managers <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="metrics-grid">
          <Metric
            label="SELECTED-SCOPE RECORD"
            value={
              manager
                ? `${manager.wins}–${manager.losses}${manager.ties ? `–${manager.ties}` : ""}`
                : "—"
            }
            note="W–L, with ties when applicable"
          />
          <Metric
            label="TOTAL POINTS"
            value={fmt(manager?.points)}
            note="All official scores, including zeros"
          />
          <Metric
            label="AVERAGE SCORE"
            value={fmt(manager?.average)}
            note={`${manager?.averageGames ?? 0} scored weeks in average`}
          />
          <Metric
            label="MISSED SUBMISSIONS"
            value={manager?.missed ?? "—"}
            note="Zero-point weeks · automatic losses"
          />
        </div>
        <Panel
          title="Scoring history"
          aside={
            <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
          }
        >
          <ScoringChart
            data={scoringHistory(seasons, username, excludeZeros)}
          />
        </Panel>
        <Panel title="Season by season" eyebrow="THE CAREER TIMELINE">
          <DataTable
            rows={seasons
              .filter((s) => s.members.includes(username))
              .map((s) => ({
                year: s.year,
                ...standings([s], excludeZeros).find(
                  (r) => r.manager === username,
                )!,
              }))}
            rowKey={(r) => String(r.year)}
            columns={[
              {
                key: "year",
                label: "SEASON",
                value: (r) => r.year,
                render: (r) => (
                  <Link
                    className="text-link"
                    href={`/seasons?season=${r.year}`}
                  >
                    {r.year} <ArrowUpRight size={12} />
                  </Link>
                ),
              },
              ...managerColumns.filter((c) => c.key !== "manager"),
            ]}
          />
        </Panel>
        <div className="metrics-grid">
          <Metric
            label="LONGEST WINNING RUN"
            value={longestStreak(seasons, username, "W")}
            note="Consecutive known weeks · season-bounded"
          />
          <Metric
            label="LONGEST LOSING RUN"
            value={longestStreak(seasons, username, "L")}
            note="Ties and unknown weeks break streaks"
          />
          <Metric
            label="OBSERVED LINEUPS"
            value={
              seasons
                .flatMap((s) => s.lineups)
                .filter((l) => l.manager === username).length
            }
            note="Score-only weeks remain in career stats"
          />
          <Metric
            label="CAREER GAMES"
            value={career?.games ?? 0}
            note="All imported regular-season results"
          />
        </div>
        <ObservedSelections seasons={seasons} manager={username} />
        <Panel title="Every Sunday, on record">
          <GameTable
            rows={games(seasons).filter((g) => g.manager === username)}
          />
        </Panel>
      </>
    );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>The permanent roster.</h2>
          <p className="muted">
            Teams change. Usernames don’t. All career totals follow the manager.
          </p>
        </div>
        <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
      </div>
      <Panel
        title="Manager directory"
        aside={<span className="badge">{league.managers.length} IMPORTED</span>}
      >
        <div className="table-toolbar">
          <label className="inline-search">
            <Search size={15} />
            <input
              aria-label="Filter managers"
              placeholder="Find a DK username…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="qualification-filter">
            Minimum imported games
            <select
              aria-label="Manager minimum participation"
              value={minimumGames}
              onChange={(e) => setMinimumGames(Number(e.target.value))}
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
          rows={rows.filter(
            (r) =>
              r.manager.toLowerCase().includes(query.toLowerCase()) &&
              r.games >= minimumGames,
          )}
          columns={managerColumns}
          rowKey={(r) => r.manager}
          emptyText={
            query
              ? "No usernames match that search."
              : "The roster is awaiting its roll call."
          }
        />
      </Panel>
      <InfoNote>
        Required: public usernames in data/managers.json and season membership
        in each season file. Career records aggregate only the seasons a manager
        actually played. The directory requires at least one imported game by
        default; raise the visible threshold for rate comparisons.
      </InfoNote>
    </>
  );
}
function RecordBook({ seasons }: { seasons: Season[] }) {
  const [kind, setKind] = useState("all");
  const list = records(seasons).filter(
    (r) => kind === "all" || r.kind === kind,
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>The numbers you won’t live down.</h2>
          <p className="muted">
            Every record links to the evidence. Tied records share the
            spotlight.
          </p>
        </div>
        <div className="tabs">
          <button
            className={kind === "all" ? "selected" : ""}
            onClick={() => setKind("all")}
          >
            All records
          </button>
          <button
            className={kind === "glory" ? "selected" : ""}
            onClick={() => setKind("glory")}
          >
            The good
          </button>
          <button
            className={kind === "shame" ? "selected" : ""}
            onClick={() => setKind("shame")}
          >
            The questionable
          </button>
        </div>
      </div>
      {list.length ? (
        <div className="record-grid">
          {list.map((r, i) => (
            <RecordCard key={`${r.title}-${r.game.id}-${i}`} record={r} />
          ))}
        </div>
      ) : (
        <div className="record-grid">
          {[
            { title: "The ceiling", sub: "Highest weekly score", icon: Trophy },
            {
              title: "Won by a whisker",
              sub: "Closest winning margin",
              icon: Target,
            },
            {
              title: "Unnecessary roughness",
              sub: "Largest blowout",
              icon: Zap,
            },
            {
              title: "Wrong place, wrong week",
              sub: "Highest score in a loss",
              icon: ArrowDownRight,
            },
            {
              title: "Task failed successfully",
              sub: "Lowest score in a win",
              icon: Flame,
            },
            {
              title: "The basement",
              sub: "Lowest submitted score",
              icon: Archive,
            },
          ]
            .filter(
              (_, i) => kind === "all" || (kind === "glory" ? i < 3 : i >= 3),
            )
            .map((r) => (
              <div className="record-card" key={r.title}>
                <r.icon size={22} className="orange" />
                <span className="record-placeholder">—</span>
                <h3>{r.title}</h3>
                <p>{r.sub}</p>
                <span className="micro-tag">AWAITING THE EVIDENCE</span>
              </div>
            ))}
        </div>
      )}
      <InfoNote>
        Record candidates use source-reconciled regular-season results only.
        Incomplete seasons are withheld until complete and reconciled. Records
        cover only the reconciled seasons in this scope. Zero-point weeks remain
        in official statistics; “The basement” is explicitly limited to nonzero
        submissions.
      </InfoNote>
    </>
  );
}
function RecordCard({
  record: r,
}: {
  record: ReturnType<typeof records>[number];
}) {
  return (
    <article className={`record-card ${r.kind}`}>
      <div className="record-card-top">
        {r.kind === "glory" ? <Trophy size={20} /> : <Flame size={20} />}
        <span className="eyebrow">{r.subtitle}</span>
      </div>
      <div className="record-value">
        {fmt(r.value)} <small>{r.unit}</small>
      </div>
      <h3>{r.title}</h3>
      <ManagerName username={r.game.manager} />
      <Link className="text-link" href={`/matchups/${r.game.id}`}>
        {r.game.year} · Week {r.game.week} · vs {r.game.opponent}
        <ArrowUpRight size={13} />
      </Link>
    </article>
  );
}
function Rivalries({
  seasons,
  comparison = false,
  excludeZeros = false,
  setExcludeZeros,
}: {
  seasons: Season[];
  comparison?: boolean;
  excludeZeros?: boolean;
  setExcludeZeros?: (value: boolean) => void;
}) {
  const members = [...new Set(seasons.flatMap((s) => s.members))].sort();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const first = members.includes(a) ? a : members[0] || "";
  const second =
    members.includes(b) && b !== first
      ? b
      : members.find((m) => m !== first) || "";
  const history =
    first && second && first !== second ? rivalry(seasons, first, second) : [];
  const rows = standings(seasons, excludeZeros);
  const ra = rows.find((r) => r.manager === first),
    rb = rows.find((r) => r.manager === second);
  return (
    <>
      <div className="versus-select">
        <div>
          <span className="eyebrow">IN THIS CORNER</span>
          <label className="select-wrap large">
            <Users size={18} />
            <select
              aria-label="First manager"
              value={first}
              onChange={(e) => {
                setA(e.target.value);
                if (e.target.value === second) setB(first);
              }}
            >
              <option value="" disabled>
                Select a manager
              </option>
              {members.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={16} />
          </label>
        </div>
        <span className="versus">
          VS<span>LET THE NUMBERS TALK</span>
        </span>
        <div>
          <span className="eyebrow">AND IN THIS CORNER</span>
          <label className="select-wrap large">
            <Users size={18} />
            <select
              aria-label="Second manager"
              value={second}
              onChange={(e) => setB(e.target.value)}
            >
              <option value="" disabled>
                Select a manager
              </option>
              {members
                .filter((m) => m !== first)
                .map((m) => (
                  <option key={m}>{m}</option>
                ))}
            </select>
            <ChevronDown size={16} />
          </label>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="HEAD-TO-HEAD MEETINGS"
          value={members.length ? history.length : "—"}
          note="Regular-season matchups only"
        />
        <Metric
          label={`${first || "MANAGER A"} WINS`}
          value={
            members.length
              ? history.filter((g) => g.result === "W").length
              : "—"
          }
          note="Direct meetings in selected seasons"
        />
        <Metric
          label={`${second || "MANAGER B"} WINS`}
          value={
            members.length
              ? history.filter((g) => outcomeOther(g, seasons) === "W").length
              : "—"
          }
          note="Double-zero games give neither a win"
        />
        <Metric
          label="HEAD-TO-HEAD TIES"
          value={
            members.length
              ? history.filter((g) => g.result === "T").length
              : "—"
          }
          note="Equal nonzero scores"
        />
      </div>
      <Panel
        title={comparison ? "The Comparison Lab" : "Side-by-side résumé"}
        eyebrow="ALL OPPONENTS / SELECTED SEASONS"
        aside={
          comparison && setExcludeZeros ? (
            <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
          ) : undefined
        }
      >
        {ra && rb ? (
          <div className="comparison">
            {[
              { label: "Imported games", a: ra.games, b: rb.games },
              { label: "Total wins", a: ra.wins, b: rb.wins },
              {
                label: "Win percentage",
                a: pct(ra.winRate),
                b: pct(rb.winRate),
              },
              { label: "Total points", a: fmt(ra.points), b: fmt(rb.points) },
              {
                label: excludeZeros
                  ? "Scoring average (missed weeks excluded)"
                  : "Scoring average (zeros included)",
                a: fmt(ra.average),
                b: fmt(rb.average),
              },
              {
                label: "Included scoring weeks",
                a: ra.averageGames,
                b: rb.averageGames,
              },
              {
                label: "Points per imported game (zeros included)",
                a: ra.games ? fmt(ra.points / ra.games) : "—",
                b: rb.games ? fmt(rb.points / rb.games) : "—",
              },
              { label: "Best week", a: fmt(ra.best), b: fmt(rb.best) },
              { label: "Missed submissions", a: ra.missed, b: rb.missed },
            ].map((r) => (
              <div key={r.label}>
                <strong>{r.a}</strong>
                <span>{r.label}</span>
                <strong>{r.b}</strong>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Rivalries require rivals."
            text="Import public usernames, season rosters, and weekly matchups to unlock head-to-head comparisons."
          />
        )}
      </Panel>
      {comparison && (
        <InfoNote>
          Comparison rates have no qualification cutoff: both managers’ actual
          game counts and average denominators are shown. Season and missed-week
          filters affect averages; official totals and W/L stay unchanged. Use
          Leaderboards for qualified rankings.
        </InfoNote>
      )}
      <Panel title="The head-to-head receipts" aside={<Swords size={20} />}>
        <GameTable rows={history} />
      </Panel>
    </>
  );
}
function outcomeOther(g: Game, seasons: Season[]) {
  return games(seasons).find(
    (other) => other.id === g.id && other.manager === g.opponent,
  )?.result;
}
function Luck({ seasons }: { seasons: Season[] }) {
  const [minimumWeeks, setMinimumWeeks] = useState(1);
  const [view, setView] = useState("career");
  const rows = luckTable(seasons).filter((r) => r.weeks >= minimumWeeks);
  const seasonRows = seasons
    .flatMap((s) => luckTable([s]).map((r) => ({ ...r, year: s.year })))
    .filter((r) => r.weeks >= minimumWeeks);
  const weeks = seasons.reduce((n, s) => n + completeWeeks(s).length, 0);
  return (
    <>
      <div className="editorial-callout">
        <FlaskConical size={32} />
        <div>
          <span className="eyebrow">THE SCHEDULE DOESN’T LOVE YOU BACK</span>
          <h2>What if you played everyone, every week?</h2>
          <p>
            All-play takes your score against all 15 opponents. Expected wins
            measure the result a neutral schedule would produce. The difference?
            That’s your excuse, quantified.
          </p>
        </div>
      </div>
      <div className="metrics-grid">
        <Metric
          label="FULLY IMPORTED WEEKS"
          value={weeks}
          note="16 official scores required per week"
        />
        <Metric
          label="ALL-PLAY COMPARISONS"
          value="15"
          note="Opposing scores per eligible week"
        />
        <Metric
          label="EXPECTED WINS"
          value="Σ AP%"
          note="Weekly all-play win equivalents / 15"
        />
        <Metric
          label="LUCK DIFFERENTIAL"
          value="W − xW"
          note="Official wins − expected; same eligible weeks"
        />
      </div>
      <Panel
        title="The luck spectrum"
        eyebrow="POSITIVE = SCHEDULE BENEFICIARY"
        aside={
          <span className="chart-legend">
            <span className="green-dot" /> Fortunate <span /> Unfortunate
          </span>
        }
      >
        <LuckChart data={rows} />
      </Panel>
      <Panel
        title="Good teams. Convenient schedules."
        aside={
          <label className="qualification-filter">
            Minimum eligible weeks
            <select
              aria-label="Luck minimum participation"
              value={minimumWeeks}
              onChange={(e) => setMinimumWeeks(Number(e.target.value))}
            >
              {[1, 14, 28].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
        }
      >
        <div className="table-toolbar">
          <div className="tabs">
            <button
              className={view === "career" ? "selected" : ""}
              onClick={() => setView("career")}
            >
              Career luck
            </button>
            <button
              className={view === "season" ? "selected" : ""}
              onClick={() => setView("season")}
            >
              Manager seasons
            </button>
          </div>
        </div>
        <DataTable
          rows={
            view === "career"
              ? rows.map((r) => ({ ...r, year: null as number | null }))
              : seasonRows
          }
          rowKey={(r) => `${r.manager}-${r.year ?? "career"}`}
          initialSort="luck"
          columns={[
            {
              key: "manager",
              label: "MANAGER",
              value: (r) => r.manager,
              render: (r) => <ManagerName username={r.manager} />,
            },
            {
              key: "year",
              label: "SEASON",
              value: (r) => r.year,
              render: (r) => r.year ?? "Career",
            },
            {
              key: "weeks",
              label: "WEEKS",
              value: (r) => r.weeks,
              numeric: true,
            },
            {
              key: "allPlayWins",
              label: "AP W",
              value: (r) => r.allPlayWins,
              numeric: true,
            },
            {
              key: "allPlayLosses",
              label: "AP L",
              value: (r) => r.allPlayLosses,
              numeric: true,
            },
            {
              key: "allPlayTies",
              label: "AP T",
              value: (r) => r.allPlayTies,
              numeric: true,
            },
            {
              key: "expected",
              label: "EXPECTED W",
              value: (r) => r.expected,
              render: (r) => fmt(r.expected),
              numeric: true,
            },
            {
              key: "actual",
              label: "OFFICIAL W",
              value: (r) => r.actual,
              render: (r) => fmt(r.actual, 0),
              numeric: true,
            },
            {
              key: "opponentAverage",
              label: "OPP AVG",
              value: (r) => r.opponentAverage,
              render: (r) => fmt(r.opponentAverage),
              numeric: true,
            },
            {
              key: "luck",
              label: "LUCK +/−",
              value: (r) => r.luck,
              render: (r) => (
                <span className={r.luck >= 0 ? "green-text" : "orange"}>
                  {r.luck > 0 ? "+" : ""}
                  {fmt(r.luck)}
                </span>
              ),
              numeric: true,
            },
          ]}
        />
      </Panel>
      <InfoNote>
        Actual wins are official W outcomes only; official ties add no wins.
        All-play score ties, including 0–0, receive half-credit in expected
        wins. Opponent average measures schedule scoring strength in the same
        eligible weeks (zeros included). The visible minimum defaults to one
        eligible week. Both zero scores remain official losses. Incomplete weeks
        are excluded from both expected and actual wins in this view, and never
        silently filled with zeros. This is a descriptive schedule metric, not a
        measure of predictive skill.
      </InfoNote>
    </>
  );
}
function GameTable({ rows }: { rows: Game[] }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => `${r.id}-${r.manager}`}
      columns={[
        { key: "season", label: "SEASON", value: (r) => r.year, numeric: true },
        { key: "week", label: "WEEK", value: (r) => r.week, numeric: true },
        {
          key: "manager",
          label: "MANAGER",
          value: (r) => r.manager,
          render: (r) => <ManagerName username={r.manager} />,
        },
        {
          key: "opponent",
          label: "OPPONENT",
          value: (r) => r.opponent,
          render: (r) => <ManagerName username={r.opponent} />,
        },
        {
          key: "score",
          label: "POINTS",
          value: (r) => r.score,
          render: (r) => fmt(r.score),
          numeric: true,
        },
        {
          key: "against",
          label: "OPP PTS",
          value: (r) => r.against,
          render: (r) => fmt(r.against),
          numeric: true,
        },
        {
          key: "result",
          label: "RESULT",
          value: (r) => r.result,
          render: (r) => (
            <Link
              href={`/matchups/${r.id}`}
              className={`result-badge ${r.result}`}
            >
              {r.result} <ArrowUpRight size={11} />
            </Link>
          ),
        },
      ]}
      emptyText="No imported matchups in this view."
    />
  );
}
function SeasonArchive({
  seasons,
  league,
  excludeZeros,
  setExcludeZeros,
  matchId,
}: {
  seasons: Season[];
  league: League;
  excludeZeros: boolean;
  setExcludeZeros: (v: boolean) => void;
  matchId?: string;
}) {
  const [chosen, setChosen] = useState<number | null>(null);
  const [week, setWeek] = useState("all");
  const current =
    seasons.find((s) => s.year === chosen) ?? seasons[seasons.length - 1];
  const [tab, setTab] = useState("standings");
  const detail = matchId ? matchupById(league, matchId) : undefined;
  return (
    <>
      {detail && <MatchupDetail detail={detail} />}
      <div className="archive-tabs" aria-label="Choose season">
        {seasons.map((s) => (
          <button
            key={s.year}
            className={current.year === s.year ? "selected" : ""}
            onClick={() => {
              setChosen(s.year);
              setWeek("all");
            }}
          >
            <span>{s.year}</span>
            <small>
              {s.status === "pending"
                ? "Pending import"
                : s.status === "partial"
                  ? "Partial archive"
                  : "Complete"}
            </small>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            SEASON{" "}
            {String(
              YEARS.indexOf(current.year as (typeof YEARS)[number]) + 1,
            ).padStart(2, "0")}
          </span>
          <h2>{current.year}: the official ledger.</h2>
        </div>
        <span className="badge">
          {current.status === "pending"
            ? "AWAITING DATA"
            : `${current.status.toUpperCase()} IMPORT`}
        </span>
      </div>
      <div className="metrics-grid">
        <Metric
          label="SEASON MEMBERS"
          value={current.members.length || "—"}
          note="16 when membership is fully imported"
        />
        <Metric
          label="REGULAR-SEASON WEEKS"
          value={current.regularSeasonWeeks ?? "—"}
          note="14 or 15 · confirm from official source"
        />
        <Metric
          label="IMPORTED MATCHUPS"
          value={current.matchups.length}
          note="Official head-to-head results"
        />
        <Metric
          label="DETAILED LINEUPS"
          value={current.lineups.length}
          note="Missing selections never remove scores"
        />
      </div>
      <Panel
        title="The season, in context"
        eyebrow={
          current.verification === "reconciled"
            ? "SOURCE-RECONCILED REGULAR SEASON"
            : "SUMMARY WITHHELD / AWAITING RECONCILIATION"
        }
      >
        {current.verification === "reconciled" ? (
          <div className="dialog-body">
            <p>
              {current.year} covers {current.regularSeasonWeeks} regular-season
              weeks and {current.matchups.length} official matchups.{" "}
              {standings([current])[0]?.manager} leads the final regular-season
              standings by wins, then points.{" "}
              {games([current]).filter((g) => g.score === 0).length} missed
              submissions remain in the official record. No playoff or
              championship result is included.
            </p>
          </div>
        ) : (
          <EmptyState
            compact
            title="The season story awaits its receipts."
            text="Complete the regular-season import and reconcile official results against source standings before publishing a final season summary."
          />
        )}
      </Panel>
      <Panel
        title={`${current.year} season archive`}
        aside={
          <AverageToggle value={excludeZeros} onChange={setExcludeZeros} />
        }
      >
        <div className="table-toolbar">
          <div className="tabs">
            <button
              className={tab === "standings" ? "selected" : ""}
              onClick={() => setTab("standings")}
            >
              Standings
            </button>
            <button
              className={tab === "weekly" ? "selected" : ""}
              onClick={() => setTab("weekly")}
            >
              Weekly results
            </button>
          </div>
          {tab === "weekly" && (
            <label className="select-wrap">
              <span className="sr-only">Filter week</span>
              <select
                aria-label="Filter week"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
              >
                <option value="all">All weeks</option>
                {Array.from(
                  { length: current.regularSeasonWeeks ?? 0 },
                  (_, i) => (
                    <option key={i} value={i + 1}>
                      Week {i + 1}
                    </option>
                  ),
                )}
              </select>
              <ChevronDown size={13} />
            </label>
          )}
        </div>
        {tab === "standings" ? (
          <DataTable
            rows={standings([current], excludeZeros)}
            columns={managerColumns}
            rowKey={(r) => r.manager}
          />
        ) : (
          <GameTable
            rows={games([current]).filter(
              (g, i) =>
                i % 2 === 0 && (week === "all" || g.week === Number(week)),
            )}
          />
        )}
        <div className="panel-bottom">
          Ranked by wins, then total points. No playoff or championship games.
        </div>
      </Panel>
      <Panel title="Season scoring rhythm">
        <ScoringChart
          data={scoringHistory([current], undefined, excludeZeros)}
        />
      </Panel>
      <InfoNote>
        {`Required file: data/seasons/${current.year}.json. `}Incomplete imports
        remain labeled and are never described as final standings.
      </InfoNote>
    </>
  );
}
function MatchupDetail({
  detail,
}: {
  detail: NonNullable<ReturnType<typeof matchupById>>;
}) {
  const { season, matchup: m } = detail;
  const lineups = season.lineups.filter(
    (l) =>
      l.week === m.week && [m.home.manager, m.away.manager].includes(l.manager),
  );
  return (
    <Panel
      title={`${season.year} · Week ${m.week}`}
      eyebrow="THE UNDERLYING RECEIPT"
    >
      <div className="matchup-score">
        {[m.home, m.away].map((r) => (
          <div key={r.manager}>
            <ManagerName username={r.manager} />
            <strong>{fmt(r.score)}</strong>
            <span>
              {r.result} ·{" "}
              {r.score === 0
                ? "MISSED SUBMISSION · AUTOMATIC LOSS"
                : "OFFICIAL SCORE & RESULT"}
            </span>
          </div>
        ))}
      </div>
      {m.provenance ? (
        <InfoNote>
          Source: {m.provenance.sourceId} · {m.provenance.sheet} ·{" "}
          {m.provenance.cells.join(", ")}. Opaque source ID; private documents
          are not published.
        </InfoNote>
      ) : (
        <InfoNote>
          Source cell reference not yet imported. No original private source
          document is published.
        </InfoNote>
      )}
      <div className="lineup-grid">
        {[m.home, m.away].map((r) => {
          const lineup = lineups.find((l) => l.manager === r.manager);
          return (
            <div key={r.manager}>
              <h3>{r.manager} · selections</h3>
              {lineup?.provenance && (
                <InfoNote>
                  Lineup source: {lineup.provenance.sourceId} ·{" "}
                  {lineup.provenance.sheet} ·{" "}
                  {lineup.provenance.cells.join(", ")}
                </InfoNote>
              )}
              {lineup ? (
                <DataTable
                  rows={lineup.selections}
                  rowKey={(p) => p.slot}
                  columns={[
                    { key: "slot", label: "SLOT", value: (p) => p.slot },
                    { key: "name", label: "PLAYER", value: (p) => p.name },
                    {
                      key: "salary",
                      label: "SALARY",
                      value: (p) => p.salary,
                      render: (p) => `$${fmt(p.salary, 0)}`,
                      numeric: true,
                    },
                    {
                      key: "points",
                      label: "PTS",
                      value: (p) => p.points ?? null,
                      render: (p) => fmt(p.points),
                      numeric: true,
                    },
                  ]}
                />
              ) : (
                <EmptyState
                  compact
                  title="Score retained. Selections unavailable."
                  text="The official weekly result counts. Player data has not been supplied."
                />
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
function DNA({ seasons }: { seasons: Season[] }) {
  const [manager, setManager] = useState("all");
  const [query, setQuery] = useState("");
  const members = [...new Set(seasons.flatMap((s) => s.members))].sort();
  const activeManager = members.includes(manager) ? manager : "all";
  const selectedManager = activeManager === "all" ? undefined : activeManager;
  const players = playerOwnership(seasons, selectedManager);
  const strategy = lineupStrategies(seasons, selectedManager);
  const scores = games(seasons).filter(
    (g) => !selectedManager || g.manager === selectedManager,
  ).length;
  return (
    <>
      <div className="editorial-callout">
        <Dna size={34} />
        <div>
          <span className="eyebrow">YOUR LINEUPS HAVE A TYPE</span>
          <h2>Same salary cap. Very different instincts.</h2>
          <p>
            Favorite players, positional habits, and the stacking decisions
            you’ll defend to the end. Built only from actual roster selections.
          </p>
        </div>
      </div>
      <div className="section-heading">
        <div>
          <h2>The lineup fingerprint.</h2>
          <p className="muted">
            Selection rates reflect imported league lineups, not DraftKings
            contest ownership.
          </p>
        </div>
        <label className="select-wrap">
          <Users size={14} />
          <select
            aria-label="Filter lineup analytics by manager"
            value={activeManager}
            onChange={(e) => setManager(e.target.value)}
          >
            <option value="all">All managers</option>
            {members.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </label>
      </div>
      <div className="metrics-grid">
        <Metric
          label="VERIFIED LINEUPS"
          value={strategy?.count ?? 0}
          note={`${scores} official scores in selected scope`}
        />
        <Metric
          label="LINEUP COVERAGE"
          value={scores ? pct((strategy?.count ?? 0) / scores) : "—"}
          note="Detailed lineups / official scores"
        />
        <Metric
          label="AVERAGE SALARY USED"
          value={strategy ? `$${fmt(strategy.averageSalary, 0)}` : "—"}
          note="Of the $50,000 cap · known lineups"
        />
        <Metric
          label="QB + PASS-CATCHER STACK"
          value={strategy ? pct(strategy.stackRate) : "—"}
          note="QB with ≥1 same-team WR or TE"
        />
      </div>
      <Panel
        title="The usual suspects"
        eyebrow="PLAYER SELECTION TENDENCIES"
        aside={<Dna size={20} />}
      >
        <div className="table-toolbar">
          <label className="inline-search">
            <Search size={15} />
            <input
              placeholder="Filter by NFL player…"
              aria-label="Filter players"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="toolbar-note">
            Denominator: {strategy?.count ?? 0} imported lineups
          </span>
        </div>
        <DataTable
          rows={players.filter((p) =>
            p.name.toLowerCase().includes(query.toLowerCase()),
          )}
          rowKey={(p) => p.id}
          initialSort="selections"
          columns={[
            { key: "name", label: "PLAYER", value: (p) => p.name },
            { key: "position", label: "POS", value: (p) => p.position },
            {
              key: "selections",
              label: "SELECTIONS",
              value: (p) => p.selections,
              numeric: true,
            },
            {
              key: "ownership",
              label: "SELECTION RATE",
              value: (p) => p.ownership,
              render: (p) => pct(p.ownership),
              numeric: true,
            },
            {
              key: "salary",
              label: "AVG SALARY",
              value: (p) => p.salary,
              render: (p) => `$${fmt(p.salary, 0)}`,
              numeric: true,
            },
          ]}
          emptyText="The lineup DNA hasn’t been sequenced."
        />
      </Panel>
      <Panel
        title="The FLEX philosophy"
        eyebrow="ONE SLOT / THREE SCHOOLS OF THOUGHT"
      >
        {strategy ? (
          <div className="flex-breakdown">
            {strategy.flex.map((f) => (
              <div key={f.position}>
                <strong>{f.position}</strong>
                <div className="progress-track">
                  <span
                    style={{ width: `${(f.count / strategy.count) * 100}%` }}
                  />
                </div>
                <span>
                  {pct(f.count / strategy.count)} · {f.count} lineups
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            title="No selections. No armchair psychology."
            text="Import detailed nine-player lineups to reveal FLEX usage and roster-building tendencies."
          />
        )}
      </Panel>
      <InfoNote>
        Missing lineups are excluded from selection denominators. Their official
        scores stay in standings and scoring statistics. Ownership here is
        descriptive and subject to incomplete-data bias.
      </InfoNote>
    </>
  );
}
function Hall({ seasons }: { seasons: Season[] }) {
  const [side, setSide] = useState<"glory" | "shame">("glory");
  const entries = records(seasons).filter((r) => r.kind === side);
  const rows = standings(seasons.filter((s) => s.verification === "reconciled"))
    .filter((r) => r.missed > 0)
    .sort((a, b) => b.missed - a.missed);
  return (
    <>
      <div className="hall-heading">
        <span className="hall-emblem">
          {side === "glory" ? (
            <Trophy size={48} strokeWidth={1} />
          ) : (
            <Flame size={48} strokeWidth={1} />
          )}
        </span>
        <span className="eyebrow">THE LEAGUE NEVER FORGETS</span>
        <h2>
          {side === "glory"
            ? "Greatness deserves a plaque."
            : "So does a truly terrible Sunday."}
        </h2>
        <p>
          {side === "glory"
            ? "Extraordinary weeks. Statistically earned immortality."
            : "The rough edges of the archive. Public scores, public consequences."}
        </p>
        <div className="tabs">
          <button
            className={side === "glory" ? "selected" : ""}
            onClick={() => setSide("glory")}
          >
            <Trophy size={14} /> Hall of Fame
          </button>
          <button
            className={side === "shame" ? "selected" : ""}
            onClick={() => setSide("shame")}
          >
            <Flame size={14} /> Hall of Shame
          </button>
        </div>
      </div>
      {entries.length ? (
        <div className="record-grid">
          {entries.map((r, i) => (
            <RecordCard key={`${r.title}-${i}`} record={r} />
          ))}
        </div>
      ) : (
        <Panel
          title={
            side === "glory"
              ? "Room for legends."
              : "The wall is mercifully empty."
          }
        >
          <EmptyState
            title={
              side === "glory"
                ? "The pedestals are ready."
                : "Nobody’s getting roasted without evidence."
            }
            text="Achievements and lowlights will be calculated from official weekly results. No nominations. No invented lore."
          />
        </Panel>
      )}
      {side === "shame" && (
        <Panel
          title="The no-show register"
          eyebrow="ZERO-POINT WEEKS / AUTOMATIC LOSSES"
        >
          <DataTable
            rows={rows}
            rowKey={(r) => r.manager}
            initialSort="missed"
            columns={[
              {
                key: "manager",
                label: "MANAGER",
                value: (r) => r.manager,
                render: (r) => <ManagerName username={r.manager} />,
              },
              {
                key: "missed",
                label: "MISSED WEEKS",
                value: (r) => r.missed,
                numeric: true,
              },
              {
                key: "games",
                label: "IMPORTED GAMES",
                value: (r) => r.games,
                numeric: true,
              },
            ]}
          />
        </Panel>
      )}
      <InfoNote>
        Every plaque has a calculable rule and links to its underlying matchup.
        Equal records share credit. Unverified and partial imports are withheld
        from awards. Published achievements cover{" "}
        {seasons.filter((s) => s.verification === "reconciled").length} of{" "}
        {seasons.length} selected seasons.
      </InfoNote>
    </>
  );
}
