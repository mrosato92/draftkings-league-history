import fs from "node:fs";
import path from "node:path";
import { leagueSchema, YEARS, type League } from "./schema";

let cached: { signature: string; league: League } | undefined;

/** Only explicitly named, sanitized JSON files enter the public application. */
export function loadLeague() {
  const files = ["managers.json", ...YEARS.map((y) => `seasons/${y}.json`)];
  const signature = files
    .map((file) => {
      const stat = fs.statSync(path.join(process.cwd(), "data", file));
      return `${stat.mtimeMs}:${stat.size}`;
    })
    .join("|");
  if (cached?.signature === signature) return cached.league;
  const read = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8"));
  const seasons = YEARS.map((year) => {
    const data = read(`seasons/${year}.json`);
    if (data.year !== year)
      throw new Error(`Season year does not match filename: ${year}.json`);
    return data;
  });
  const league = leagueSchema.parse({
    managers: read("managers.json"),
    seasons,
  });
  cached = { signature, league };
  return league;
}
