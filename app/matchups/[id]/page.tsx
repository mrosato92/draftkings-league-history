import { dashboardData } from "@/lib/dashboard-data";
import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { loadLeague } from "@/lib/data";
import { matchupById } from "@/lib/analytics";
export const dynamicParams = false;
export const dynamic = "force-static";
export function generateStaticParams() {
  return loadLeague().seasons.flatMap((s) =>
    s.matchups.map((m) => ({ id: m.id })),
  );
}
export default async function MatchupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const league = loadLeague();
  if (!matchupById(league, id)) notFound();
  return (
    <Dashboard
      {...dashboardData(league, { section: "seasons", matchId: id })}
      section="seasons"
      matchId={id}
    />
  );
}
