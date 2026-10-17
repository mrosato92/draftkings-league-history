import Dashboard from "@/components/dashboard";
import { loadLeague } from "@/lib/data";
export const dynamic = "force-static";
export default function Home() {
  return <Dashboard league={loadLeague()} section="" />;
}
