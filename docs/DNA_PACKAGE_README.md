# DraftKings DNA player-selection import

Extracted from original seven private workbooks. 1,574 complete nine-slot lineup strings; all 1,574 matched an official score and username/week/year in the existing 2019–2025 results import (score tolerance 0.06). No raw workbooks or contact information are included.

Files `lineups_YEAR.json` contain `week`, `manager`, `official_score`, `selections` with `slot`, `name`, `position`, and `source` sheet/row. `position: null` for a FLEX player whose position could not be independently determined from other roster occurrences; do not guess. Player names are raw names, not globally unique player IDs. Source sheet/row must be transformed to permitted sanitized provenance if included publicly.

**Important:** Salary and NFL team are not in lineup strings; do not fabricate them. Existing `lib/schema.ts` requires `salary` and `team`, so Codex must adapt the schema to support verified selection-only lineups and gate salary/stacking metrics until enriched. Use actual selections for player frequency, lineup overlap, and manager tendencies. Do not assume missing lineup means missed submission. The 74 unavailable lineups must remain unavailable.

Potential issue: selection ordering in raw strings is not guaranteed; slots RB1/RB2 and WR1/WR2/WR3 are assigned in encountered order only. Do not interpret them as salary rank or preferred order.

Check unresolved_flex_YEAR.json before deciding whether to import those particular lineups as full selections or partial data.

Run data validation, tests, and build. Reconcile totals and ensure 2019 fused defense names are separated (e.g. RavensWR => Ravens + WR). No original workbook files should be committed.
