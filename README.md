# The League Archive

A dark sports analytics dashboard for the 2019–2025 regular seasons of a 16-team DraftKings head-to-head fantasy football league. Next.js App Router, TypeScript, Tailwind CSS, Recharts, and validated static JSON. Prepared for Vercel.

**Historical results are imported and source-reconciled:** 824 matchups, 1,648 manager-week scores, 26 public usernames, 103 regular-season weeks, and 12 zero-point missed submissions across 2019–2025. All seven season files are complete and reconciled. Scores, official W/L, opponent pairings, and season standings were checked against the supplied private workbooks; see [the import audit](docs/HISTORY_IMPORT_REPORT.md).

**Player-level selections are not imported.** All 1,648 scores remain valid while lineup coverage is explicitly zero. DraftKings DNA and profile-selection panels show honest unavailable-data states. Original spreadsheets and contact information remain outside this repository.

## Develop

Use Node.js 24 (`.nvmrc`; Node 22–24 supported).

```sh
npm ci
npm run dev
```

In a shell with a restricted home directory, add `--cache /tmp/dk-npm-cache` immediately after `npm` for install commands. No environment variables, API keys, database, or external services are required. Fonts are self-hosted through npm packages.

```sh
npm run validate:data   # validate sanitized imports, membership, weeks, and lineups
npm test                # analytics regressions and full historical-import reconciliation
npm run lint
npm run typecheck
npm run build
npm start               # production server; build first
```

`npm run test:e2e` runs the browser smoke suite against a production build on port 3100. It uses system Chromium when available, or Playwright Chromium (`npx playwright install chromium`). Build before running it.

## The site

| Section          | Route                               | Historical analytics                                                      |
| ---------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| League HQ        | `/`                                 | Career leaders, scoring trends, record spotlight                          |
| Manager Profiles | `/managers`, `/managers/[username]` | Career records, season breakdowns, weekly history, statistical rankings   |
| Leaderboards     | `/leaderboards`                     | Qualified wins, win %, points, scoring average, all-play %, expected wins |
| Comparison Lab   | `/compare`                          | Side-by-side totals and rates with season and missed-week filters         |
| Record Book      | `/records`                          | Score/margin records, tied record holders, matchup evidence               |
| Rivalry Center   | `/rivalries`                        | Manager comparison, direct matchups, head-to-head records                 |
| Luck Lab         | `/luck`                             | All-play records, expected wins, actual-minus-expected wins               |
| Season Archives  | `/seasons`                          | Season standings, week filters, official results                          |
| DraftKings DNA   | `/dna`                              | Player selection rates, salary usage, QB stacks, FLEX usage               |
| Fame & Shame     | `/hall-of-fame`                     | Calculated achievements, lowlights, missed-submission register            |
| Matchup receipts | `/matchups/[id]`                    | Both official scores and available player selections                      |

All sections have season filtering. Leaderboard participation thresholds are visible; scoring-average leaders default to 14 included weeks. Official W/L/T is imported explicitly, with optional sanitized sheet/cell provenance. Source reconciliation is tracked independently of import completeness. All-play numerical ties include 0–0; official 0–0 remains a double loss. Luck is official wins minus expected wins. `?season=2019` links directly to a season scope. Tables support sorting, the manager directory and player list support search, and ⌘/Ctrl+K opens archive search. The average filter excludes only missed submissions; it never changes official totals. Mobile navigation, keyboard dialogs, a skip link, reduced-motion handling, and exact values in tables complement the desktop dashboard.

## Import real data safely

Read [the data contract and import guide](docs/DATA.md). Import only public DraftKings usernames, regular-season scores, and permitted player selections. Never commit participant contact information, raw exports, or original private documents. Ignored `private/`, `raw-data/`, and `imports/` paths are local conveniences, **not a security guarantee**; inspect every Git diff before staging. Raw documents should preferably stay outside the checkout entirely.

All data files are public application inputs. Strict schemas reject extra metadata fields, duplicate results, unknown season members, out-of-season weeks, and invalid lineups. Missing lineup selections do not invalidate official scores. Never replace missing scores with zero.

## Deploy on Vercel

1. Push this repository to GitHub and import `mrosato92/draftkings-league-history` in Vercel's **Add New → Project** flow.
2. Select the **Next.js** framework preset and repository root (`./`). Use **Node.js 24.x** in Project Settings.
3. Build command: `npm run build`. Install command: `npm ci`. Leave output directory at the Next.js default. No environment variables are required.
4. Choose the branch you want Vercel to deploy as production. Vercel usually defaults to `main`; if this implementation is on a feature branch, merge it into `main` or explicitly select that branch.
5. Deploy. Vercel serves the generated pages, self-hosted fonts, and static assets. Data validation runs during prerendering; malformed data fails the build rather than silently corrupting statistics.
6. Commit sanitized data updates to the production branch to regenerate standings and all manager/matchup routes. Preview deployments are also public unless you enable Vercel deployment protection.

This project does not require Vercel-specific runtime configuration or a database. GitHub delivery is separate from deploying: no Vercel deployment is created automatically by the code in this repository.

## Architecture

- `app/`: static App Router routes, metadata, global design, and error states.
- `components/dashboard.tsx`: navigation, filters, section views, dialogs, and matchup inspection.
- `components/ui.tsx`: reusable panels, metrics, sortable tables, empty states, and identity links.
- `components/leaderboards.tsx`: qualified metric leaders and profile player selections with observed coverage.
- `components/charts.tsx`: interactive scoring and luck visualizations; empty charts contain no simulated series.
- `lib/schema.ts`: public data contract and cross-file validation.
- `lib/data.ts`: explicit build-time file loading; never scans private import folders.
- `lib/analytics.ts`: pure functions for standings, all-play/luck, records, rivalries, and lineup tendencies.
- `data/`: complete, source-reconciled sanitized results for 2019–2025; no raw workbooks or player selections.
- `tests/`: synthetic rule regressions, independent historical-data oracles, package checksums, and populated production-browser checks; never imported by application code.

The authoritative [PROJECT_SPEC.md](PROJECT_SPEC.md) and [AGENTS.md](AGENTS.md) remain the product and engineering guidance. Rules and statistical caveats are documented in [docs/DATA.md](docs/DATA.md) and in the site's Methodology dialog. No affiliation with DraftKings or the NFL is implied.

The implementation review and remaining data/deployment prerequisites are recorded in [docs/SPEC_REVIEW.md](docs/SPEC_REVIEW.md).

The sanitized package handoff is preserved in [IMPORT_NOTES.md](IMPORT_NOTES.md). Original workbooks were used only for private verification; source-cell aliases are documented in the import report.
