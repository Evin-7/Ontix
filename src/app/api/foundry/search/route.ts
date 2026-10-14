import { NextResponse } from "next/server";
import { getFoundryModuleContext } from "@/server/providers/foundry/dashboard-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const routeByType = {
  Projects: "/projects", Cases: "/cases", Customers: "/customers",
  Employees: "/employees", Teams: "/teams", Approvals: "/approvals",
} as const;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 100) {
    return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const context = await getFoundryModuleContext("overview");
    if (!context) return NextResponse.json({ error: "Sign in to search your workspace." }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    const needle = query.toLocaleLowerCase();
    const sources = [
      { type: "Projects", path: routeByType.Projects, rows: context.workspace.projects.map((r) => ({ id: r.id, title: r.name, subtitle: `Project · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.name} ${r.status}` })) },
      { type: "Cases", path: routeByType.Cases, rows: context.workspace.cases.map((r) => ({ id: r.id, title: r.title, subtitle: `Case · ${r.priority} priority · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.title} ${r.status} ${r.priority}` })) },
      { type: "Customers", path: routeByType.Customers, rows: context.workspace.customers.map((r) => ({ id: r.id, title: r.name, subtitle: `Customer · ${r.industry}`, text: `${r.id} ${r.name} ${r.industry} ${r.status}` })) },
      { type: "Employees", path: routeByType.Employees, rows: context.workspace.employees.map((r) => ({ id: r.id, title: r.name, subtitle: `Employee · ${r.role}`, text: `${r.id} ${r.name} ${r.role}` })) },
      { type: "Teams", path: routeByType.Teams, rows: context.workspace.teams.map((r) => ({ id: r.id, title: r.name, subtitle: `Team · ${r.department}`, text: `${r.id} ${r.name} ${r.department}` })) },
      { type: "Approvals", path: routeByType.Approvals, rows: context.workspace.approvals.map((r) => ({ id: r.id, title: r.id, subtitle: `Approval · ${r.status.replaceAll("_", " ")}`, text: `${r.id} ${r.status} ${r.caseId ?? ""} ${r.requestedBy ?? ""}` })) },
    ];
    const results = sources.flatMap((source) => source.rows
      .filter((row) => row.text.toLocaleLowerCase().includes(needle))
      .slice(0, 6)
      .map(({ id, title, subtitle }) => ({ id, type: source.type, title, subtitle, href: `${source.path}?record=${encodeURIComponent(id)}` })),
    ).slice(0, 30);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
