# DraftKings DNA: 2019–2025 selection import

Imported **1,574 verified nine-selection lineups**, representing **14,166 selections** and **95.51% coverage** of the 1,648 official manager-week scores. All 824 official matchups, scores, outcomes, season rosters, and scoring provenance objects are unchanged. The supplied package handoff is preserved in [DNA_PACKAGE_README.md](DNA_PACKAGE_README.md).

## Verified coverage

| Season    | Observed lineups | Official manager-weeks |   Coverage | Missing lineups | Unknown FLEX positions |
| --------- | ---------------: | ---------------------: | ---------: | --------------: | ---------------------: |
| 2019      |              205 |                    224 |     91.52% |              19 |                     15 |
| 2020      |              207 |                    224 |     92.41% |              17 |                      8 |
| 2021      |              235 |                    240 |     97.92% |               5 |                      8 |
| 2022      |              236 |                    240 |     98.33% |               4 |                      2 |
| 2023      |              235 |                    240 |     97.92% |               5 |                      5 |
| 2024      |              238 |                    240 |     99.17% |               2 |                      6 |
| 2025      |              218 |                    240 |     90.83% |              22 |                      0 |
| **Total** |        **1,574** |              **1,648** | **95.51%** |          **74** |                 **44** |

The 74 unavailable lineups include all 12 zero-point missed submissions and **62 nonzero-scoring weeks**. Missing selection detail is not a missed submission. All 1,648 scores remain in official records and averages by default, and the existing optional zero-average filter still changes averages only.

Coverage includes verified nine-selection lineups whose FLEX position is unknown. It does not pretend that those positions are resolved. DNA coverage tables allow season, manager, and manager-season grouping and show both numerator and denominator under the selected season/manager/week scope.

## Source reconciliation and preservation

Every supplied `official_score` exactly matched the unchanged existing score after matching year, week, and canonical username. Two casing-only source variants were mapped uniquely to existing identities: `cmack2023` → `Cmack2023` (56 lineups) and `dlegz123` → `Dlegz123` (73 lineups). No manager identities or official results were renamed.

All **1,574 source lineup strings** and all **14,166 slot/name pairs** were independently checked against the original private workbook's `Lineup` column. All matched, including the separated 2019 defense labels that were fused to the next WR token in the raw text. Referenced export scores also matched the official scores to two decimals; maximum cached spreadsheet residue was approximately 0.00003 points. Source cells are preserved as `F<row>` under sanitized `season_YEAR` IDs and actual technical sheet names (`Results_WN` or `Week N`). Raw workbooks, entry IDs, contact information, and original private documents are not published.

`tests/fixtures/dna-workbook-verification.json` contains sanitized verification counts. `tests/fixtures/dna-import-manifest.json` records the package fingerprint, canonical selection hashes, casing mappings, unresolved observations, and official-data projection hashes. The latter hash every original season object with `lineups` removed from the comparison; they protect official score and result data independently of this additive import. Integer-valued JSON numbers are canonicalized consistently (`0.0` and `0` represent the same score).

The importer is repeatable: `python3 scripts/import-dna.py /path/outside/checkout/package.zip`. It refuses to replace different pre-existing lineup work. Importing the same package again preserves the same data. Run validation and all project checks after import.

## Unresolved FLEX positions

All **44 unresolved observations** were reviewed and retained with `position: null` and their real player names intact:

- **36** lack independent position support in the package's other roster observations.
- **8** involve conflicting observed role tags: Cordarrelle Patterson (RB/WR) or Taysom Hill (QB/TE).

The same-week export `Roster Position` column was also reviewed. It reports FLEX for most of these observations and includes some observed RB/TE roster labels for the multi-role players; it is not a supplied authoritative player-eligibility registry. No unique historical FLEX position is chosen from general NFL knowledge or ambiguous role evidence. Unknown observations appear in the DNA unresolved-position table, on source matchup receipts, and as a separate category in position/FLEX trends. All stay in selection and coverage denominators. Resolving them requires reliable player/eligibility evidence for the relevant slate.

The package contains **671 distinct raw player/defense labels**, not a registry of 671 verified global NFL identities. Exact names are grouped as supplied. Same-name players could be conflated, and spelling/suffix variants remain separate (for example, no alias is merged merely because it looks similar). **No player IDs were fabricated.** Internal React/grouping keys identify name groups only and are not stored as NFL/DraftKings IDs.

## Working DNA analytics

- Most frequently selected players and manager favorites, with source-label search, position and roster-slot filters, full-dataset sorting, and pagination. Derrick Henry is the most frequent exact label with 128 selections in the full imported sample.
- Repeat picks: within each manager, appearances after that manager's first selection of a label in the selected scope. These need not be consecutive weeks.
- Position counts, shares of nine times the observed lineup count, and picks per lineup, broken down by season. FLEX charts include Unknown in the denominator. RB1/RB2 and WR1/WR2/WR3 are storage encounter order, not priorities or salary ranks.
- Manager comparison favorites use each manager's own observed sample and show counts/rates for both managers.
- Same-year, same-week lineup overlap compares any two managers using only paired observed lineups. Shared share is common labels / 9; Jaccard is common labels / (18 − common labels). Both observed sample sizes and common official weeks are disclosed. Missing pairs never become zero overlap; roster-slot order does not change the sets.
- Source links lead to the existing matchup receipts and imported selection rows. Unknown positions and absent enrichment remain explicit there and in profiles.

## Explicitly unavailable enrichment

No salary, NFL team, stable player-ID, or individual player-score field was supplied. Those fields are omitted from the import. Missing salaries are never `$0`; missing team data is never treated as a zero stacking rate. Salary utilization and QB/pass-catcher stacking remain unavailable in the current dataset. Future enrichment can enable those metrics only for fully known qualifying lineups, with qualifying sample counts shown.

Unrelated static pages receive no player selections; profiles receive only that manager's lineups and receipts only their two relevant lineups. Full archive lineup counts are supplied independently so this payload reduction does not distort coverage displays. The loader caches validated data by file signature and refreshes when inputs change.

## Manager coverage across all seven seasons

| DraftKings username | Observed lineups | Official manager-weeks | Coverage | Unknown FLEX positions |
| ------------------- | ---------------: | ---------------------: | -------: | ---------------------: |
| 3liManning          |               68 |                     73 |   93.15% |                      5 |
| amast5              |               71 |                     73 |   97.26% |                      0 |
| arkazemi            |               29 |                     30 |   96.67% |                      0 |
| brettalexander23    |              100 |                    103 |   97.09% |                      3 |
| busta1030           |               28 |                     30 |   93.33% |                      0 |
| ChiefGoonba         |               40 |                     43 |   93.02% |                      0 |
| Cmack2023           |               56 |                     59 |   94.92% |                      1 |
| Dlegz123            |               73 |                     75 |   97.33% |                      2 |
| G.Logan319          |               12 |                     14 |   85.71% |                      1 |
| Guardshark          |               85 |                     89 |   95.51% |                      1 |
| jkeenan4            |               99 |                    103 |   96.12% |                      1 |
| jpalladino91        |               12 |                     14 |   85.71% |                      1 |
| kjrosato            |               97 |                    103 |   94.17% |                      3 |
| ljhaddock           |               28 |                     30 |   93.33% |                      1 |
| missmoneystacks     |               71 |                     73 |   97.26% |                      3 |
| mmayeski            |               58 |                     60 |   96.67% |                      5 |
| molone96            |               87 |                     89 |   97.75% |                      3 |
| mrosato92           |               99 |                    103 |   96.12% |                      4 |
| mszawaluk3          |               29 |                     30 |   96.67% |                      0 |
| notrheelyhere       |               26 |                     28 |   92.86% |                      2 |
| OldMoneyStacks      |               99 |                    103 |   96.12% |                      2 |
| reggiemonster       |              100 |                    103 |   97.09% |                      0 |
| smallery            |               97 |                    103 |   94.17% |                      0 |
| tkerensky           |               13 |                     14 |   92.86% |                      2 |
| tommyjz28           |               25 |                     28 |   89.29% |                      0 |
| Zacharylichtman     |               72 |                     75 |   96.00% |                      4 |

## Validation

Passed data validation, **52 unit/data tests**, **30 production-browser tests**, lint, type checking, and production build. The build preserves all 26 manager routes and 824 matchup routes. Tests lock the full official-data projection, source selection hashes, every manager-season coverage denominator, all 671 label frequencies, null/enrichment handling, repeat definitions, paired-week overlaps, pagination/sorting, and active manager/season/week filters. Early-load controls are gated until event handlers are ready, preventing pre-hydration selections from being lost.
