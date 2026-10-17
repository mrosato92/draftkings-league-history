import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { loadLeague } from "@/lib/data";
import { sections } from "@/lib/navigation";
export const dynamicParams = false;
export function generateStaticParams() {
  return sections.filter((s) => s.id).map((s) => ({ section: s.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return { title: sections.find((s) => s.id === section)?.label };
}
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const nav = sections.find((s) => s.id === section);
  if (!nav) notFound();
  return <Dashboard league={loadLeague()} section={nav.id} />;
}
