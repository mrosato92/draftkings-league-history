# 2019–2025 historical import audit

The sanitized import package and all seven private source workbooks were supplied by the user. The eight JSON files were copied **byte-for-byte**, preserving official outcomes, scores, matchup IDs, season membership, reconciled flags, and source references. `IMPORT_NOTES.md` preserves the package handoff. The package's SHA-256 is `17377a65341b8429b56459bed2c2d1eb958aa92af6392c26bc527cc4eb2ffcd5`.

## Coverage and source reconciliation

| Season    |   Weeks | Matchups | Manager-week scores | Missed submissions | Standing rows checked | Regular-season standings leader |
| --------- | ------: | -------: | ------------------: | -----------------: | --------------------: | ------------------------------- |
| 2019      |      14 |      112 |                 224 |                  3 |                    16 | ChiefGoonba                     |
| 2020      |      14 |      112 |                 224 |                  1 |                    16 | jkeenan4                        |
| 2021      |      15 |      120 |                 240 |                  2 |                    16 | kjrosato                        |
| 2022      |      15 |      120 |                 240 |                  1 |                    16 | Dlegz123                        |
| 2023      |      15 |      120 |                 240 |                  2 |                    16 | mrosato92                       |
| 2024      |      15 |      120 |                 240 |                  1 |                    16 | smallery                        |
| 2025      |      15 |      120 |                 240 |                  2 |                    16 | arkazemi                        |
| **Total** | **103** |  **824** |           **1,648** |             **12** |               **112** | **26 unique usernames**         |

Only the original `Schedule and Results` and `Standings by Team` sheets were used for official scoring reconciliation. No roster/contact sheet was published. All private spreadsheets remain outside the Git checkout. There are no imported playoff or championship results.

For **every** manager-week score, the two supplied matchup provenance references were checked in home/away order against the source workbook: week, manager block's public username, opponent username, own score, opponent score, and the explicit official `Win?` flag. All 1,648 rows matched. All 112 final standing rows matched wins, points for, points against, and ranking by wins then points. No official outcomes needed correction. Every zero score is an explicit official loss. This package contains no official ties or actual 0–0 matchup; synthetic rule tests still cover double-zero losses.

The public provenance sheet label `Schedule/Results` is a sanitized alias for the original `Schedule and Results` sheet. Its cell anchors identify the week row in the manager block: manager identity is in the block header, opponent is two columns right, own score three columns right, opponent score four columns right, and `Win?` five columns right. No filename, source document, or participant contact value is exposed by those references.

The spreadsheets contain floating-point cached values such as hundredth-point scores with tiny residual fractions. Their scores and totals agree with the supplied two-decimal JSON after rounding to cents. The maximum weekly raw difference was **0.00003 points**; the maximum season-total raw difference was **0.000058 points**, both far below half a cent. Imported scores were left unchanged. The source workbook fingerprints and sanitized verification counts are retained in `tests/fixtures/history-workbook-reconciliation.json`.

## Independent analytics checks

- Official career and all seven season W/L/T records, games, zero submissions, points for/against, scoring averages, win percentages, standings rank, and ranking order are recomputed from raw JSON matchup sides using integer cents, independently of the application grouping functions.
- All **325 unordered manager pairs** are checked in **both directions**, including matchup IDs, chronological order, score orientation, and official result; together those histories contain exactly 824 matchups.
- All **24,720 all-play comparisons** (1,648 × 15) are independently enumerated. Equal numeric scores earn an all-play tie, including hypothetical zero ties; official outcomes remain unchanged.
- Every eligible manager-week, season, and career expected-win result is checked with integer half-win units: `(2 × all-play wins + all-play ties) / 30`. Weekly expected wins sum to eight, and career expected wins sum to 824. Official wins also sum to 824; luck uses official wins minus expected wins in the same weeks.
- Excluding missed weeks changes scoring averages and their denominators only. All official W/L, point totals, ranks, games, rivalries, and luck samples remain intact.
- Package file checksums guard against accidental changes to the supplied JSON. Matchup IDs containing public username periods (for example, `G.Logan319`) are supported; URL separators and dot-segment traversal remain rejected.

Selected independently checked receipts:

| Measure                 | Verified result                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Career wins             | smallery: 63–40 over 103 weeks                                                       |
| Career scoring          | mrosato92: 13,889.72 points over 103 weeks                                           |
| Career expected wins    | mrosato92: 61.333333… (920 all-play wins / 15)                                       |
| Highest official score  | ChiefGoonba: 223.06, 2019 week 1, matchup `2019-w01-ChiefGoonba-kjrosato`            |
| Closest winning margin  | molone96: 0.10, 2021 week 5, matchup `2021-w05-OldMoneyStacks-molone96`              |
| Highest score in a loss | OldMoneyStacks: 190.02, 2019 week 1, matchup `2019-w01-OldMoneyStacks-reggiemonster` |
| Lowest score in a win   | jkeenan4: 71.64, 2025 week 11, matchup `2025-w11-jkeenan4-kjrosato`                  |
| Lowest nonzero score    | kjrosato: 48.36, in that same 2025 week 11 matchup                                   |

Record holders publish only from complete, source-reconciled seasons. All seven imported seasons now satisfy that condition, so the score-based record book, awards, and season summaries are enabled. Source verification covers the underlying rows for every displayed record, not merely the examples above.

## Lineup boundary and deployment

The package intentionally contains **zero detailed lineups**. Although raw workbooks contain player-export sheets, this task imports the sanitized official score package; no player selections, salaries, or ownership values were inferred or fabricated. All 1,648 scores remain included, and lineup coverage is explicitly 0%. Extracting and reconciling player-level exports is a separate task.

The production build generates all 26 manager pages and 824 matchup pages. Browser checks cover actual leaders, season filters, source-linked records, a username-period route, zero-average filtering, rivalry history, expected-win leaders, and the missing-lineup disclosure. Required validation commands are `npm run validate:data`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`.

Pushing the completed commit to `main` supplies the historical data to the configured Vercel automatic deployment. GitHub push success is separate from verifying the Vercel deployment's live status.

## Validation result

All required checks passed: data validation, **36 unit/data tests**, **23 production-browser tests**, lint, type checking, and production build. The build generated 863 pages overall, including all 26 manager routes and all 824 matchup routes. Raw spreadsheets and private contact/source material were excluded from the commit.
