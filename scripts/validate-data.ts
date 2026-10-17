import { loadLeague } from "../lib/data";
const league = loadLeague();
console.log(
  `Valid: ${league.managers.length} public usernames, ${league.seasons.length} season files, ${league.seasons.reduce((n, s) => n + s.matchups.length, 0)} matchups, ${league.seasons.reduce((n, s) => n + s.lineups.length, 0)} detailed lineups.`,
);
for (const s of league.seasons)
  console.log(`${s.year}: ${s.status}, ${s.verification}`);
