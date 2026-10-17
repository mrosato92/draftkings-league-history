import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { loadLeague } from "@/lib/data";
export const dynamicParams = false;
export function generateStaticParams() {
  return loadLeague().managers.map((m) => ({ username: m.username }));
}
export default async function Manager({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const league = loadLeague();
  if (!league.managers.some((m) => m.username === username)) notFound();
  return <Dashboard league={league} section="managers" username={username} />;
}
