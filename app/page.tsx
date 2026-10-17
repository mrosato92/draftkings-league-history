import { dashboardData } from "@/lib/dashboard-data";
import Dashboard from "@/components/dashboard";
import { loadLeague } from "@/lib/data";
export const dynamic = "force-static";
export default function Home() {
  return (
    <Dashboard {...dashboardData(loadLeague(), { section: "" })} section="" />
  );
}
