# League import handoff

Sanitized, regular-season-only JSON based on previously reconciled official team-week CSV. Includes all 824 matchups and 26 usernames. The original private workbooks are not included.

These seven seasons are marked reconciled because the source CSV audit matched schedule/results with season standings within rounding tolerance. **Before publishing, rerun `npm run validate:data`, test, and build, and manually review representative records against the original workbooks.**

Player-level lineups are intentionally empty; separate extraction is still required. Do not invent selections. Source IDs are sanitized; cell references are retained.

Import by copying `data/managers.json` and `data/seasons/*.json` into the repository, replacing existing pending placeholders.

Coverage: [(2019, 14, 112, 3), (2020, 14, 112, 1), (2021, 15, 120, 2), (2022, 15, 120, 1), (2023, 15, 120, 2), (2024, 15, 120, 1), (2025, 15, 120, 2)]
