import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/foundry/dashboard-shell";
import { getFoundryDashboardSession } from "@/server/providers/foundry/dashboard-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await getFoundryDashboardSession();
  if (!current) redirect("/");
  return <DashboardShell role={current.session.role}>{children}</DashboardShell>;
}
