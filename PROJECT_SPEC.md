# DraftKings League History — Project Specification

## Mission
Build a polished, desktop-first, publicly accessible historical analytics site for a 16-team head-to-head DraftKings NFL Classic league. Coverage: **2019–2025 (seven seasons)**. The site is a permanent archive, updated **once per year** after the completed season. Prioritize rigorous statistics, drill-downs, and entertaining, snarky but evidence-based commentary.

## Sources and authority
Original yearly workbooks are the source of truth and may be provided separately; **do not assume they are in this repository**. Official Schedule/Results sheets govern matchup outcomes and scores; standings sheets are used for reconciliation. Individual `Week X` sheets provide DraftKings lineups and player-level data. Some manually submitted lineups have official scores but no selection details. Preserve source workbook, sheet, and cell provenance when feasible. Never invent results, player picks, or missing details. Historical figures mentioned in conversations are provisional until independently checked against source files.

## League rules
- Use **DraftKings username** as the stable unique manager ID. Usernames have never changed. Membership varies across seasons; there are 16 teams per season and 26 unique usernames are verified in the imported 2019–2025 results (see `docs/HISTORY_IMPORT_REPORT.md`).
- **Regular season only.** Exclude playoff brackets, playoff results, championships, and championship awards until verified playoff data is supplied.
- Season lengths vary: 14 weeks in 2019–2020, 15 weeks in 2021–2025 (verified against the supplied source workbooks).
- Rank standings by wins, then points for. Historical week-by-week standings may appear in source sheets.
- A zero score means missed submission and **automatic loss**, including if both competitors score zero. Do not convert a 0–0 matchup to a tie. Track official results explicitly rather than deriving winner solely from scores.
- No canceled/omitted regular-season competition weeks.
- All managers use the same weekly DraftKings NFL Classic slate, standard scoring, $50,000 salary cap, and nine-player lineup: QB, 2 RB, 3 WR, TE, FLEX, DST. Picks are hidden until kickoff.
- A score without lineup selections remains valid for official scores, wins/losses, and scoring records. Missing lineup details are null/unavailable, **not** a zero lineup.
- Include zero-score weeks by default in official records, all-play and expected wins. Offer an include/exclude-zero filter for applicable scoring averages and performance views; clearly label denominators and methodology.

## Statistical definitions
- All-play: compare each manager's official weekly score to every other participating manager that same week; wins/losses across the 15 other managers. Score ties should be tracked separately or assigned 0.5 each in expected-win fractions; document the convention.
- Expected wins per week: (all-play wins + 0.5 × all-play ties) / (number of other active managers). Career expected wins sum weekly expected wins.
- Luck differential: official wins minus expected wins. Distinguish descriptive schedule luck from causality.
- Never treat zeros as ties in the **official** head-to-head record. An all-play score tie may be recorded separately under the documented all-play convention.
- For multi-season comparisons show both totals and rates; apply clearly disclosed minimum participation thresholds to leaderboards.
- Distinguish regular-season career totals, per-season results, weekly records, and player-selection analytics. Player-pick statistics must display observed lineup coverage.

## Desired site
1. **League HQ:** overview, record highlights, leaders, historical timeline.
2. **Manager profiles:** 26 historical usernames, career and season records, weekly scores, streaks, charts, observed player selections.
3. **Leaderboards:** wins, win percentage, points, scoring rates, all-play, expected wins, filters and qualifying thresholds.
4. **Record Book:** high/low scores, highest losing score, lowest winning score, blowouts, close finishes, streaks, unusual feats, source-linked receipts.
5. **Rivalry Center:** choose two usernames, head-to-head results, matchup chronology, statistical comparison, evidence-based snark.
6. **Luck Lab:** expected versus actual wins, all-play, schedule strength, fortunate/unfortunate seasons.
7. **Season Archives:** each season's standings, weekly results, scoring charts and season-level stories.
8. **DraftKings DNA:** most-picked NFL players, lineup tendencies, salary and ownership where available; show sample sizes and missing-data caveats.
9. **Hall of Fame / Hall of Shame:** regular-season accomplishments and disasters only; no championship claims without playoff data.
10. **Comparison Lab:** side-by-side manager metrics, filters by season and inclusion of zero weeks.

## Design
Premium modern sports analytics aesthetic, desktop-first; combine ESPN visual energy, Pro Football Reference information density, and polished interactive charts. Dark theme, excellent typography, sortable tables, clickable record receipts, season/manager filters. Humor may be sarcastic, snarky and passive-aggressive, but **never invent incidents or unsupported narratives**. No manager photos or real-name displays. No official league name established; use a neutral working title.

## Architecture and publishing
GitHub repository: `mrosato92/draftkings-league-history` (public). Vercel hosting; annual manual data refresh, not a live DraftKings integration. Prefer a maintainable static-first Next.js + TypeScript application, with structured JSON datasets and no database unless justified. Optimize for desktop; mobile is not a priority. No authentication needed for the public site.

## Privacy and provenance
Never commit original workbooks containing phone numbers/emails, private participant contact data, credentials, or secrets to the public repository. Publish only sanitized usernames and league-relevant derived data. Validate each output against original records; record coverage and anomalies. Separate verified facts from hypotheses.

## Delivery milestones
1. Inventory source files and verify schema/identity mapping.
2. Extract and reconcile official weekly matchup data and standings.
3. Extract Week X player selections; reconcile official versus exported scores, quantify missingness.
4. Build tested statistical engine and source-traceable records.
5. Build interactive site, validate UX and calculations.
6. Connect GitHub to Vercel, deploy, verify public site.
7. Document annual import and release procedure.

## Status
The website implementation and sanitized 2019–2025 results are present: 824 matchups, 1,648 manager-week scores, 26 public usernames, and 12 missed submissions across 103 regular-season weeks. Every manager-week source row and all seven final regular-season standings have been reconciled against the user-supplied private workbooks; see `docs/HISTORY_IMPORT_REPORT.md`. Original workbooks and contact rosters remain outside the public repository. No player-level selections have been imported or invented; lineup extraction is still a separate milestone. GitHub delivery supports the configured Vercel automatic deployment; live deployment success must be verified separately.
