# Implementation review against the authoritative specification

Reviewed after pulling `origin/main` at `c90cbfa`. `PROJECT_SPEC.md` and `AGENTS.md` remain authoritative and unchanged. No historical source documents or results were available during this review.

## Conflicts corrected

| Finding                                                                                           | Correction                                                                                                                                              | Regression evidence                                                                             |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| All-play reused the official automatic-loss function, so two zeros became two hypothetical losses | Dedicated numeric all-play comparison. Equal scores, including zero, are all-play ties; official 0–0 remains L/L                                        | Double-zero, negative-score, full-week expected-win conservation, and tied-score unit cases     |
| Luck added half a win for an official tie                                                         | Actual wins count explicit official W outcomes only; luck = official wins − expected wins in the same eligible weeks                                    | Official-tie and source-authority regression cases                                              |
| A partial import could publish record holders or awards without source reconciliation             | Explicit `verification` metadata defaults to `unverified`. Only complete, source-reconciled seasons publish records, awards, and final season summaries | Schema rejects reconciled partial seasons; records withheld for complete but unverified imports |
| Some scoring/rate views lacked per-manager denominators                                           | Games, included scoring observations, eligible all-play weeks, and profile lineup coverage are displayed                                                | Qualification tests distinguish imported games, included scores, and eligible weeks             |

These conventions are documented in `docs/DATA.md` and the in-app Methodology dialog. Half-credit for an official tie remains only in the explicitly labeled win-percentage convention; it no longer enters official-win luck. No league rule was changed.

## Missing capabilities added

- `/leaderboards`: qualified official wins, win percentage, total points, scoring average, all-play percentage, and expected wins; minimum observations are visible and adjustable. Rates default to 14 observations, totals to one. Unknown all-play values stay unknown.
- `/compare`: side-by-side manager totals and rates, global season scope, zero-week scoring-average control, games, and included scoring denominators. It shares the existing Rivalry Center implementation and keeps head-to-head receipts.
- Manager profiles: observed NFL player selections and their imported-lineup denominator/coverage, with score-only weeks retained.
- Luck Lab: manager-season rows for comparing fortunate and unfortunate seasons; opponent scoring strength uses the same eligible weeks as expected/actual wins.
- Season archives: source-reconciled season summaries; unverified season stories remain empty.
- Matchup drill-down: optional lineup sheet/cell references as well as official result references; no original source document links.
- Lowest official-score record includes missed submissions, alongside the explicitly separate lowest nonzero-submission record.
- Average trend tooltips show the observed scoring sample size.
- Dependent manager selectors fall back to valid members when a season filter changes.

## Existing behavior confirmed

- Permanent public usernames are the only manager identities; membership is per season.
- Official W/L/T is imported explicitly. The zero-loss rule is enforced even at 0–0; it is never inferred from a score comparison alone.
- Standings rank by wins, then total points; exact ties share ranks.
- Zero weeks remain in official totals, all-play, and expected wins by default. Average filters do not rewrite official results.
- Missing selections do not remove official scores; missing scores are never filled with zeros.
- Complete imports require 16 members, eight matchups per week, and all 14 or 15 confirmed regular-season weeks. Unknown weeks break streaks and trend lines.
- Nine unique valid roster slots, nonduplicate players, and the $50,000 cap are validated.
- Privacy schemas reject extra private fields; source references use sanitized IDs rather than original private filenames. Raw documents and contacts remain outside the public inputs.
- Static JSON, Next.js, TypeScript, Tailwind, self-hosted fonts, and Vercel instructions remain in place.

## Work requiring external evidence or access

These are pending milestones, not completed historical findings:

1. Original yearly workbooks are absent. Identity reconciliation (including the prior, unverified count of 26 usernames), the year-specific 14/15-week pattern, official results, standings reconciliation, lineup extraction, coverage, and source anomalies cannot be verified yet. Empty season metadata remains unverified; no manager count or year-specific week length is invented.
2. After sanitized imports, an importer must reconcile official outcomes, points, and standings against the private originals before setting `verification` to `reconciled`. Schema validation proves structure and consistency, not provenance or historical truth. Lineup completeness remains independent of verified score completeness.
3. GitHub delivery does not establish Vercel project connection, deployment, or public-site validation. Deployment instructions and the annual manual release procedure are documented; those external milestones remain pending until performed.

## Validation

The review adds unit regression cases and extends the production-browser suite to the new sections, thresholds, comparison control, and season luck view. Run `npm run validate:data`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Browser checks exercise the truthful empty-data application; unit fixtures are synthetic, isolated under `tests/`, and never imported by the website.

Verified in this review: **20 unit tests and 16 production-browser tests passed**, along with data validation, lint, type checking, and production build. All seven public season files remain pending and unverified. The authoritative specification and agent instructions were preserved.

## Historical import follow-up

The missing-source/data findings above describe the initial review. The user subsequently supplied sanitized 2019–2025 JSON and all seven private workbooks. The historical results have now been imported and individually reconciled against their source schedule rows and season standings; see [HISTORY_IMPORT_REPORT.md](HISTORY_IMPORT_REPORT.md). The earlier pending-data and unverified-identity limitations are resolved. Player-selection extraction and external Vercel deployment verification remain separate from this score import.

The subsequent [DNA import](DNA_IMPORT_REPORT.md) resolves most missing-selection coverage: 1,574 of 1,648 lineups are now imported, while the 74 absent lineups and unavailable salary/team/player-ID enrichment remain explicit. Official scoring and outcome objects are unchanged.
