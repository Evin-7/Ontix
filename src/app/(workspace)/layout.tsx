import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/foundry/dashboard-shell";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await getOntixDashboardSession();
  if (!current) redirect("/");
  return <DashboardShell mode={current.mode} role={current.session.role}>{children}</DashboardShell>;
}
