import { z } from "zod";

export const YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;
export const usernameSchema = z
  .string()
  .min(1)
  .max(60)
  .regex(
    /^[A-Za-z0-9_.-]+$/,
    "Use only a public DraftKings username, never contact information.",
  );
// DraftKings deductions can produce negative scores; zero alone means a missed submission.
const scoreSchema = z.number().finite();
const officialResultSchema = z.enum(["W", "L", "T"]);
const provenanceSchema = z.strictObject({
  sourceId: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[A-Za-z0-9_-]+$/),
  sheet: z.string().regex(/^(Schedule\/Results|Standings|Week [1-9][0-9]?)$/),
  cells: z
    .array(
      z.string().regex(/^[A-Z]{1,3}[1-9][0-9]*(?::[A-Z]{1,3}[1-9][0-9]*)?$/),
    )
    .min(1),
});
const resultSchema = z.strictObject({
  manager: usernameSchema,
  score: scoreSchema,
  result: officialResultSchema,
});
const selectionSchema = z.strictObject({
  playerId: z.string().min(1),
  name: z.string().min(1).max(100),
  team: z.string().min(2).max(5),
  position: z.enum(["QB", "RB", "WR", "TE", "DST"]),
  slot: z.enum(["QB", "RB1", "RB2", "WR1", "WR2", "WR3", "TE", "FLEX", "DST"]),
  salary: z.number().int().nonnegative(),
  points: scoreSchema.optional(),
});
export const lineupSchema = z
  .strictObject({
    week: z.number().int().min(1).max(15),
    manager: usernameSchema,
    selections: z.array(selectionSchema).length(9),
    provenance: provenanceSchema.optional(),
  })
  .superRefine((lineup, ctx) => {
    if (new Set(lineup.selections.map((s) => s.slot)).size !== 9)
      ctx.addIssue({
        code: "custom",
        message: "Nine unique roster slots are required.",
      });
    if (new Set(lineup.selections.map((s) => s.playerId)).size !== 9)
      ctx.addIssue({
        code: "custom",
        message: "A player may only appear once in a lineup.",
      });
    if (lineup.selections.reduce((sum, s) => sum + s.salary, 0) > 50000)
      ctx.addIssue({
        code: "custom",
        message: "Lineup exceeds the $50,000 salary cap.",
      });
    for (const s of lineup.selections) {
      const allowed =
        s.slot === "FLEX" ? ["RB", "WR", "TE"] : [s.slot.replace(/[123]$/, "")];
      if (!allowed.includes(s.position))
        ctx.addIssue({
          code: "custom",
          message: `Invalid position for ${s.slot}.`,
        });
    }
  });
export const seasonSchema = z
  .strictObject({
    year: z
      .number()
      .int()
      .refine(
        (y) => YEARS.includes(y as (typeof YEARS)[number]),
        "Expected a season from 2019–2025.",
      ),
    status: z.enum(["pending", "partial", "complete"]),
    verification: z.enum(["unverified", "reconciled"]).default("unverified"),
    regularSeasonWeeks: z.union([z.literal(14), z.literal(15)]).nullable(),
    members: z.array(usernameSchema).max(16),
    matchups: z.array(
      z.strictObject({
        id: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[A-Za-z0-9_-]+$/),
        week: z.number().int().min(1).max(15),
        home: resultSchema,
        away: resultSchema,
        provenance: provenanceSchema.optional(),
      }),
    ),
    lineups: z.array(lineupSchema),
  })
  .superRefine((season, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (new Set(season.members).size !== season.members.length)
      fail("Duplicate season members.");
    if (
      season.status === "pending" &&
      (season.members.length ||
        season.matchups.length ||
        season.lineups.length ||
        season.regularSeasonWeeks !== null)
    )
      fail(
        "Pending seasons must contain no imported data; use partial for incomplete imports.",
      );
    if (season.status !== "pending" && season.regularSeasonWeeks === null)
      fail("Confirm 14 or 15 regular-season weeks before importing scores.");
    if (season.verification === "reconciled" && season.status !== "complete")
      fail(
        "Only complete seasons reconciled against official results and standings may publish verified records.",
      );
    const ids = new Set<string>();
    const scores = new Set<string>();
    for (const m of season.matchups) {
      if (ids.has(m.id)) fail(`Duplicate matchup ID: ${m.id}.`);
      ids.add(m.id);
      if (
        (m.home.score === 0 && m.home.result !== "L") ||
        (m.away.score === 0 && m.away.result !== "L")
      )
        fail("Zero-point submissions must have explicit official losses.");
      if (
        (m.home.score === 0 && m.away.score !== 0 && m.away.result !== "W") ||
        (m.away.score === 0 && m.home.score !== 0 && m.home.result !== "W")
      )
        fail("A submitted score beats a missed submission.");
      if (m.home.score !== 0 && m.away.score !== 0) {
        const pair = `${m.home.result}${m.away.result}`;
        if (!["WL", "LW", "TT"].includes(pair))
          fail(
            "Official results must be paired W/L, L/W, or T/T unless both scores are zero.",
          );
        if (pair === "TT" && m.home.score !== m.away.score)
          fail("Tied official results require equal nonzero scores.");
      }
      if (m.week > (season.regularSeasonWeeks ?? 0))
        fail(`Week ${m.week} falls outside the regular season.`);
      if (m.home.manager === m.away.manager)
        fail("A manager cannot play themselves.");
      for (const result of [m.home, m.away]) {
        const key = `${m.week}:${result.manager}`;
        if (!season.members.includes(result.manager))
          fail(`Unknown season member: ${result.manager}.`);
        if (scores.has(key)) fail(`Duplicate weekly result: ${key}.`);
        scores.add(key);
      }
    }
    const lineups = new Set<string>();
    for (const l of season.lineups) {
      const key = `${l.week}:${l.manager}`;
      if (!scores.has(key)) fail(`Lineup has no official score: ${key}.`);
      if (lineups.has(key)) fail(`Duplicate lineup: ${key}.`);
      lineups.add(key);
    }
    if (season.status === "complete") {
      if (season.members.length !== 16)
        fail("A complete season requires all 16 members.");
      for (let week = 1; week <= (season.regularSeasonWeeks ?? 0); week++) {
        if (season.members.some((m) => !scores.has(`${week}:${m}`)))
          fail(`Complete season is missing results for week ${week}.`);
      }
    }
  });
export const leagueSchema = z
  .strictObject({
    managers: z.array(z.strictObject({ username: usernameSchema })),
    seasons: z.array(seasonSchema).length(7),
  })
  .superRefine((league, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const managers = league.managers.map((m) => m.username);
    if (new Set(managers).size !== managers.length)
      fail("Duplicate manager username.");
    if (new Set(league.seasons.map((s) => s.year)).size !== 7)
      fail("Expected one file per season, 2019–2025.");
    const ids = league.seasons.flatMap((s) => s.matchups.map((m) => m.id));
    if (new Set(ids).size !== ids.length)
      fail("Matchup IDs must be globally unique.");
    for (const s of league.seasons)
      for (const m of s.members)
        if (!managers.includes(m))
          fail(`Member ${m} is missing from managers.json.`);
  });
export type League = z.infer<typeof leagueSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type Matchup = Season["matchups"][number];
export type Lineup = Season["lineups"][number];
