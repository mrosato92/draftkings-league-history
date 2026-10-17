# Public data contract and import guide

The 2019–2025 historical results are imported: 824 matchups, 1,648 manager-week scores, 26 public usernames, and 12 missed submissions. All seven seasons are complete and reconciled against the supplied private workbooks. Detailed player selections are not yet imported. See [HISTORY_IMPORT_REPORT.md](HISTORY_IMPORT_REPORT.md) for source reconciliation, rounding, and coverage. The contract below also governs future corrections and lineup imports.

## Files

- `data/managers.json`: an array of objects with **only** `username: string`. Use permanent public DraftKings usernames exclusively. No real names, email addresses, phone numbers, biographies, contact handles, or private source references. Usernames must use letters, digits, dots, underscores, or hyphens.
- `data/seasons/2019.json` through `2025.json`: exactly one file per season. Filenames and internal years must match.
- The executable contract is `lib/schema.ts`. Run `npm run validate:data` before building or committing.

## Season fields

| Field                | Type                             | Meaning                                                                                                  |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `year`               | integer, 2019–2025               | The season in the filename                                                                               |
| `verification`       | `unverified` or `reconciled`     | Defaults to unverified; reconciled requires a complete season and manual source/standings reconciliation |
| `status`             | `pending`, `partial`, `complete` | Honest import status, not a competitive outcome                                                          |
| `regularSeasonWeeks` | `14`, `15`, or `null`            | Confirm from the source; only pending seasons may use null                                               |
| `members`            | array of usernames               | Unique members of this season, at most 16; each must exist in managers.json                              |
| `matchups`           | array of matchup objects         | Official regular-season head-to-head scores, never synthetic bye results                                 |
| `lineups`            | array of lineup objects          | Known, complete nine-selection lineups; missing detail means no entry                                    |

`pending` requires null weeks and empty members, matchups, and lineups. Switch to `partial` before importing anything. A `complete` season requires exactly 16 members and every manager's score in every confirmed regular-season week (8 matchups per week). Lineup details can remain incomplete even when scores are complete. Completeness alone does not verify source accuracy: leave `verification` as `unverified` until official outcomes and totals have been reconciled against the original results and standings. Set `verification: "reconciled"` only after that review. Unverified and partial seasons remain available for exploratory standings, scoring, and luck analysis, but cannot publish record holders or final season summaries. Completeness never requires fabricated player selections.

Partial season rosters and weeks are permitted for staged imports. All-play and expected wins remain disabled for any week without a complete 16-manager roster and all 16 scores. Other statistics describe the imported sample and are labeled provisional.

## Matchup fields

Each matchup has exactly these fields:

- `id`: a globally unique, permanent URL-safe identifier (letters, digits, dots, underscores, hyphens; never the standalone URL dot segments `.` or `..`), such as a season/week/pairing key. Keep it stable so record links don't break.
- `week`: integer 1 through the confirmed regular-season week count. Never import playoff games.
- `home` and `away`: each has `manager` (registered season member), `score` (finite official numeric score), and **`result` (`W`, `L`, or `T`) explicitly transcribed from official results**. Home/away is storage orientation, not a home-field advantage.

A nonzero matchup requires paired W/L, L/W, or T/T results. Both zeros require L/L. T/T requires equal nonzero scores. The application uses the supplied official result instead of deriving official winners solely from points; reconcile any unusual source outcomes privately before publishing.

Each member appears at most once per week. Duplicate IDs, self-matchups, unknown members, missing scores, and playoff weeks fail validation. Decimal scores and negative deductions are allowed. **Zero means a missed submission**, not a missing value. If a result is unknown, leave the entire matchup absent until both official scores can be verified; never invent an opponent, infer their score, or put zero in a blank cell.

## Sanitized provenance

A matchup or lineup may include `provenance` with `sourceId`, `sheet`, and `cells`. `sourceId` is a neutral opaque public ID (letters, digits, underscores, hyphens), not an original private filename, path, URL, or person's name. Preserve its mapping to the original workbook privately. `sheet` is `Schedule/Results`, `Standings`, or `Week N`. `cells` is a nonempty array of spreadsheet cell/range references. These references appear in matchup drill-downs when provided, but original documents are never linked or bundled. Add provenance during extraction when the source permits it; a missing source reference is disclosed as unavailable, never fabricated.

## Optional lineup details

Each lineup contains `week`, `manager`, and exactly nine `selections`. It must reference an already imported official score for that manager/week.

Each selection has:

| Field      | Meaning                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `playerId` | Stable public NFL player identifier, consistent across seasons; defense/special teams use a stable team-defense ID |
| `name`     | Public NFL player/team-defense name                                                                                |
| `team`     | NFL team abbreviation from that week                                                                               |
| `position` | `QB`, `RB`, `WR`, `TE`, or `DST`                                                                                   |
| `slot`     | One each of `QB`, `RB1`, `RB2`, `WR1`, `WR2`, `WR3`, `TE`, `FLEX`, `DST`                                           |
| `salary`   | Official nonnegative integer DraftKings salary for the shared slate                                                |
| `points`   | Optional finite official player score; omit if unavailable (negative deductions allowed)                           |

FLEX allows RB, WR, or TE. All other slots must match their positions. Players and slots cannot repeat in a lineup; total salary cannot exceed $50,000. Do not invent selections or salaries to fill an incomplete lineup. Leave that lineup absent; preserve its official matchup score.

Official weekly scores are authoritative. Player points are optional; the app does not reconstruct official scores by summing partial player data or assume an undocumented correction policy. If source totals disagree, reconcile them privately before import.

## Statistical definitions

- **Identity and membership:** career aggregation uses exact permanent usernames; a season's roster determines its participants. No assumption of the same 16 managers across all seven years.
- **Result:** a zero score always loses. Two zeros produce two losses. Nonzero official W/L/T comes from the source sheet. If equal nonzero scores lack a verified official resolution, leave the matchup absent until reconciled; do not assume a tie or invent a tiebreaker. A negative submitted score beats a zero missed submission under the automatic-loss rule.
- **Standings:** wins descending, total official points descending. Exact equality remains a shared statistical standing, with shared rank numbers. Username order is only a stable display order, not an additional competitive tiebreaker.
- **Participation:** total leaderboards default to at least one imported game; the HQ scoring-average tab defaults to 14 included weeks. Visible selectors allow 1, 14, or 28. Average qualification uses the average denominator, respecting the zero filter. Manager directory qualification uses imported games. Luck views default to one eligible complete week, with visible qualification controls. Per-season standings include all imported members and do not impose career thresholds.
- **Career standing:** standings aggregation across imported regular seasons; membership with no scores does not imply participation in a scored game.
- **Scoring average:** sum of included official scores / number of included official scores. By default zeros count. The optional filter excludes zero scores from this average and the average scoring trend only. Unknown scores never enter the denominator. An empty denominator displays a dash. Unknown or excluded scoring weeks form gaps in trend lines.
- **Win percentage:** `(wins + ties / 2) / imported games`. Zero-point losses always enter the games denominator.
- **All-play:** compare the manager's numerical score to the other 15 managers in the same fully imported week. All equal scores, including 0–0, are tracked as all-play ties. This hypothetical comparison does not change official automatic losses.
- **Expected wins:** sum `(weekly all-play wins + weekly all-play ties / 2) / 15`. Actual official wins use the same eligible weeks.
- **Luck:** official wins minus expected wins. Official ties contribute zero wins to this differential; half-credit applies only to all-play ties within expected wins. Positive means a beneficial schedule in the imported sample. This is descriptive; incomplete weeks are excluded rather than guessed.
- **Schedule strength:** average actual opponent score across the same complete weeks used for luck; zeros included.
- **Scoring records:** highest score; closest winning margin; largest winning margin; highest score in a loss; lowest score in a win; lowest official score (zeros included); lowest nonzero submitted score. Only complete, explicitly source-reconciled seasons qualify for published record holders and awards; the UI discloses that limited scope. All tied holders are retained. The basement explicitly excludes missed submissions. Other official record candidates include zero weeks where eligible. Winning, losing, and missed-submission streaks reset at each season boundary, unknown week, or nonmatching result, and link to the final matchup in the record run.
- **Fame/Shame:** the same reproducible record calculations, plus the missed-submission count. These are record achievements, not invented championship or playoff honors.
- **Selection rate:** appearances / detailed lineups in the selected scope. Never inferred contest-wide ownership. Missing lineups are excluded; the coverage percentage reveals the sample size.
- **QB stack:** lineup with its QB and at least one same-team WR or TE. Does not assume that a same-team RB is a pass catcher.
- **Average salary/FLEX:** calculated from imported complete lineups only.

## Private-to-public import workflow

1. Keep original documents and contact information outside the checkout. Never upload them to a public issue, commit, deployment artifact, or public directory.
2. In a private working area, extract only the fields listed above. Reconcile usernames and membership for each season. Confirm 14 or 15 regular-season weeks from official records.
3. Add real usernames to `managers.json`. Populate one season at a time using `partial` until all scores are verified. There is intentionally no public example dataset that could be mistaken for results.
4. Import official matchups first. Import optional complete lineups independently; score-only weeks are supported everywhere outside lineup-specific analytics.
5. Reconcile every official W/L/T, standings position, points total, and source reference against the original results and standings. Keep any anomalies in the private review material. Only after review, set `verification` to `reconciled` on complete seasons; never mark unverified history as reconciled just to populate records.
6. Run `npm run validate:data`, `npm test`, and `npm run build`. Check the coverage/status labels and a known matchup against its private source.
7. Inspect `git status --short` and the full staged diff for private fields and files. `.gitignore` helps avoid accidents but cannot sanitize JSON values or files already tracked by Git. Schemas validate shape, not provenance or permission to publish.
8. Commit only the sanitized public JSON. Push to trigger a Vercel rebuild. New manager and matchup routes are generated at build time.

If the official league uses a nonzero tie-resolution policy, request a separate analytics change supported by the original rule before presenting a different result. Never silently invent a tiebreaker.

## Annual release

After the next supported season is completed, review the product's coverage window before adding a new year; the current contract intentionally stops at 2025. For an update inside the supported years: back up private source material outside Git, sanitize imports, reconcile official score/outcome totals and observed lineup coverage, run all required checks, review a protected Vercel preview against the private source, and merge only sanitized data. Verify the production season, one known matchup, and coverage/status labels after deployment. Preserve a Git commit reference for rollback. No live DraftKings API synchronization is assumed.
