import fs from "node:fs";
import path from "node:path";
import { leagueSchema, YEARS } from "./schema";

/** Only explicitly named, sanitized JSON files enter the public application. */
export function loadLeague() {
  const read = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", file), "utf8"));
  const seasons = YEARS.map((year) => {
    const data = read(`seasons/${year}.json`);
    if (data.year !== year)
      throw new Error(`Season year does not match filename: ${year}.json`);
    return data;
  });
  return leagueSchema.parse({ managers: read("managers.json"), seasons });
}
