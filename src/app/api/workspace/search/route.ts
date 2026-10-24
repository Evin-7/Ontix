import { NextResponse } from "next/server";
import { getCurrentDemoSession } from "@/server/providers/demo/auth";
import { getDemoWorkspace } from "@/server/providers/demo/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const routeByType = {
  Projects: "/projects", Cases: "/cases", Customers: "/customers",
  Employees: "/employees", Teams: "/teams", Approvals: "/approvals",
} as const;

export async function GET(request: Request) {
  const noStore = { "Cache-Control": "private, no-store" };
  const current = await getCurrentDemoSession();
  if (!current.session) return NextResponse.json({ error: "Sign in to view workspace records." }, { status: 401, headers: noStore });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) return NextResponse.json({ results: [] }, { headers: noStore });

  const workspace = getDemoWorkspace();
  const needle = query.toLocaleLowerCase();
  const sources = [
    { type: "Projects", path: routeByType.Projects, rows: workspace.projects.map((r) => ({ id: r.id, title: r.name, subtitle: `Project · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.name} ${r.status}` })) },
    { type: "Cases", path: routeByType.Cases, rows: workspace.cases.map((r) => ({ id: r.id, title: r.title, subtitle: `Case · ${r.priority} priority · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.title} ${r.status} ${r.priority}` })) },
    { type: "Customers", path: routeByType.Customers, rows: workspace.customers.map((r) => ({ id: r.id, title: r.name, subtitle: `Customer · ${r.industry}`, text: `${r.id} ${r.name} ${r.industry} ${r.status}` })) },
    { type: "Employees", path: routeByType.Employees, rows: workspace.employees.map((r) => ({ id: r.id, title: r.name, subtitle: `Employee · ${r.role}`, text: `${r.id} ${r.name} ${r.role}` })) },
    { type: "Teams", path: routeByType.Teams, rows: workspace.teams.map((r) => ({ id: r.id, title: r.name, subtitle: `Team · ${r.department}`, text: `${r.id} ${r.name} ${r.department}` })) },
    { type: "Approvals", path: routeByType.Approvals, rows: workspace.approvals.map((r) => ({ id: r.id, title: r.id, subtitle: `Approval · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.status} ${r.caseId} ${r.requestedBy}` })) },
  ];
  const results = sources.flatMap((source) => source.rows
    .filter((row) => row.text.toLocaleLowerCase().includes(needle))
    .slice(0, 6)
    .map(({ id, title, subtitle }) => ({ id, type: source.type, title, subtitle, href: `${source.path}?record=${encodeURIComponent(id)}` })),
  ).slice(0, 30);
  return NextResponse.json({ results }, { headers: noStore });
}
