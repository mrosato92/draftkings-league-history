# AGENTS.md — Codex Working Instructions

Read `PROJECT_SPEC.md` before any change. It is the product and data contract. The project is a **public, regular-season-only** DraftKings league archive.

## Non-negotiable rules
- Do not fabricate stats, matchups, standings, selections, player scores, ownership, league lore, championships or quotes. Use honest empty/loading states if source data is unavailable.
- Username is the only manager identity. Never publish first/last names, emails, phone numbers, original contact rosters, credentials, or unredacted workbooks.
- Zero is an official score representing missed submission and an **automatic loss**; even 0–0 means both officially lose. Do not infer official W/L by comparing points alone.
- Preserve official weekly scores even when player-selection exports are absent.
- Verified nine-selection lineups may omit player IDs, salaries, NFL teams and player points. Preserve unknown FLEX positions as null; never fill them from general football knowledge. Salary/stack metrics require explicitly available enrichment.
- Without stable player IDs, DNA groups exact source-name labels with identity caveats. RB1/WR1 suffixes encode encounter order, not priority. Keep coverage denominators and paired-week overlap samples explicit.
- Include zeros by default in official/all-play/expected wins; add explicit zero exclusion controls only where analytically appropriate.
- Exclude all playoff and championship information until verified separately.
- Preserve data provenance and disclose denominators, sample sizes, missing lineup coverage and ranking qualification thresholds.
- Historical facts from prior chat are **unverified** until reconciled against files.

## Engineering workflow
1. Inspect existing code and data before editing; preserve work from concurrent Codex tasks.
2. Use the current repository's architecture; prefer TypeScript, static data, tested pure functions, and accessible desktop-oriented UI.
3. Make focused changes and document statistical formulas and edge cases.
4. Test: official 0–0 double loss; missing lineup with nonzero official score; 14 vs 15 weeks; manager absent from season; all-play tied scores; standings win/points tiebreaker; zero-filter denominator.
5. Run available lint, typecheck, unit tests and build before claiming completion; report any unavailable checks.
6. Never commit secrets or unsanitized source workbooks to this **public** repository.
7. Prefer source-linked record drill-downs and truthful missing-data UI over impressive-looking fake numbers.
8. Provide concise summary of changed files, checks performed, open issues and deployment implications.

## Collaboration
The user plans annual updates, with ChatGPT for planning/data review, Codex for implementation, GitHub for source, and Vercel for hosting. Keep `PROJECT_SPEC.md` and this file synchronized when product rules change. Do not assume the current chat context is visible to future Codex sessions.
