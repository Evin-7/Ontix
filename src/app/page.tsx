import { getDataProviderMode } from "@/server/providers/provider-mode";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { assignFoundryCaseAction, resolveFoundryCaseAction, updateFoundryProjectStatusAction } from "./foundry-workflow-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function FoundryProviderSetup({ searchParams }: { searchParams?: Promise<{ foundry?: string }> }) {
  const [{ getCurrentFoundrySession }] = await Promise.all([
    import("@/server/providers/foundry/standalone-auth"),
  ]);
  const result = (await searchParams)?.foundry;
  const messages: Record<string, string> = {
    "setup-required": "Foundry sign-in needs server-side session storage, an encryption key, and at least one configured access group.",
    "access-denied": "Your Foundry account is not assigned to a configured Ontix access group.",
    failed: "Foundry sign-in could not be completed. Check the OAuth configuration and try again.",
    denied: "Foundry sign-in was cancelled.",
    "signed-in": "Your Foundry session is ready.",
    "action-saved": "Foundry saved the workflow change.",
    "action-failed": "Foundry could not complete the change. Check the current record and your permissions, then try again.",
  };
  let current: Awaited<ReturnType<typeof getCurrentFoundrySession>> = null;
  let sessionProblem = false;
  try {
    current = await getCurrentFoundrySession();
  } catch {
    sessionProblem = true;
  }

  if (!current) {
    return (
      <main className="provider-setup-page">
        <div className="provider-setup-stack">
          <div className="provider-setup-logo"><OntixLogo size="medium" /></div>
          <section className="provider-setup-card">
            <span className="eyebrow">FOUNDRY WORKSPACE</span>
            <h1>Sign in with Foundry</h1>
            <p>Ontix checks your current Foundry group memberships and grants a role only when a group is explicitly mapped by the server administrator.</p>
            {(result && messages[result] || sessionProblem) && <p className="provider-setup-alert" role="status">{sessionProblem ? "Foundry access could not be checked right now. Try again when the service is available." : messages[result!]}</p>}
            <a className="button button-primary foundry-signin-button" href="/api/foundry/sign-in">Continue with Palantir Foundry</a>
            <p className="provider-setup-note">This flow uses the Foundry preview endpoint for current group membership. It does not request administrative scopes or identify a person by stable user ID.</p>
          </section>
        </div>
      </main>
    );
  }

  let workspace: Awaited<ReturnType<typeof import("@/server/providers/foundry/workspace").getFoundryWorkspaceWithToken>> | null = null;
  let queryFailed = false;
  try {
    const { getFoundryWorkspaceWithToken } = await import("@/server/providers/foundry/workspace");
    workspace = await getFoundryWorkspaceWithToken(current.accessToken);
  } catch (error) {
    queryFailed = true;
    const details = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const cause = details.cause && typeof details.cause === "object" ? details.cause as Record<string, unknown> : {};
    console.error("[Foundry] Live Ontology read failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      status: typeof details.status === "number" ? details.status : undefined,
      statusCode: typeof details.statusCode === "number" ? details.statusCode : undefined,
      code: typeof details.code === "string" ? details.code : undefined,
      apiErrorName: typeof details.errorName === "string" ? details.errorName : undefined,
      apiErrorCode: typeof details.errorCode === "string" ? details.errorCode : undefined,
      causeName: typeof cause.name === "string" ? cause.name : undefined,
      causeStatus: typeof cause.status === "number" ? cause.status : undefined,
      causeApiErrorName: typeof cause.errorName === "string" ? cause.errorName : undefined,
      causeApiErrorCode: typeof cause.errorCode === "string" ? cause.errorCode : undefined,
    });
  }

  const objectTypes = ["Customer", "Project", "Employee", "Team", "OperationalCase", "ApprovalRequest"] as const;
  return (
    <main className="provider-setup-page">
      <div className="provider-setup-stack">
        <div className="provider-setup-logo"><OntixLogo size="medium" /></div>
        <section className="provider-setup-card">
          <span className="eyebrow">FOUNDRY WORKSPACE</span>
          <div className="foundry-session-heading">
            <div>
              <h1>Foundry access</h1>
              <p>Role granted from current Foundry group membership.</p>
            </div>
            <span className="foundry-role-badge">{current.session.role.toLowerCase()}</span>
          </div>
          <div className={queryFailed ? "foundry-query-status is-error" : "foundry-query-status"} role="status">
            {queryFailed ? "Live Ontology read could not be verified." : "Live Ontology reads verified with the signed-in Foundry user's access."}
          </div>
          <div className="foundry-object-grid">
            {objectTypes.map((name) => {
              const total = workspace?.totals[({
                Customer: "customers",
                Project: "projects",
                Employee: "employees",
                Team: "teams",
                OperationalCase: "cases",
                ApprovalRequest: "approvals",
              } as const)[name]] ?? 0;
              return <div className="foundry-object-row" key={name}><span>{name}</span><strong>{queryFailed ? "Unavailable" : total ? `${total.toLocaleString()} visible` : "No visible rows"}</strong></div>;
            })}
          </div>
          <form action="/api/foundry/sign-out" method="post" className="foundry-signout-form">
            <button className="button button-secondary" type="submit">Sign out of Ontix</button>
          </form>
          <p className="provider-setup-note">Foundry group membership gates the Ontix role; Foundry still enforces each user's record and action permissions. Approval decisions remain disabled until their Ontology actions and trusted employee mapping are complete.</p>
        </section>
        {workspace && <section className="foundry-workspace" aria-label="Foundry operations workspace">
          <header className="foundry-workspace-header">
            <div><span className="eyebrow">LIVE ONTOLOGY DATA</span><h2>Operations overview</h2></div>
            <span className="foundry-refresh-note">Read from Foundry · {new Date(workspace.checkedAt).toLocaleString()}</span>
          </header>
          <div className="foundry-metric-grid">
            {([
              ["Customers", workspace.totals.customers],
              ["Projects", workspace.totals.projects],
              ["Employees", workspace.totals.employees],
              ["Teams", workspace.totals.teams],
              ["Operational cases", workspace.totals.cases],
              ["Approvals", workspace.totals.approvals],
            ] as const).map(([label, value]) => <article className="foundry-metric-card" key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong></article>)}
          </div>
          <section className="foundry-data-section">
            <div className="foundry-section-heading"><div><span className="eyebrow">DELIVERY</span><h3>Projects</h3></div><span>{workspace.projects.length} shown</span></div>
            <div className="foundry-table-scroll"><table className="foundry-table"><thead><tr><th>Project</th><th>Customer</th><th>Status</th><th>Budget</th><th>Workflow</th></tr></thead><tbody>
              {workspace.projects.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><small>{project.id}</small></td><td>{workspace.customers.find((customer) => customer.id === project.customerId)?.name ?? "—"}</td><td><span className="foundry-status-pill">{project.status.replaceAll("_", " ")}</span></td><td>{project.budget === null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(project.budget)}</td><td>{["ADMINISTRATOR", "MANAGER"].includes(current.session.role) ? <form action={updateFoundryProjectStatusAction} className="foundry-inline-form"><input type="hidden" name="projectId" value={project.id} /><select aria-label={`New status for ${project.name}`} name="status" defaultValue={project.status}><option value="PLANNING">Planning</option><option value="IN_PROGRESS">In progress</option><option value="AT_RISK">At risk</option><option value="COMPLETED">Completed</option></select><button type="submit">Save</button></form> : <span className="foundry-muted">Read only</span>}</td></tr>)}
              {!workspace.projects.length && <tr><td colSpan={5} className="foundry-empty-cell">No projects are visible to this Foundry account.</td></tr>}
            </tbody></table></div>
            {workspace.hasMore.projects && <p className="foundry-list-note">Showing the first 500 of {workspace.totals.projects.toLocaleString()} projects.</p>}
          </section>
          <section className="foundry-data-section">
            <div className="foundry-section-heading"><div><span className="eyebrow">OPERATIONS</span><h3>Cases</h3></div><span>{workspace.cases.length} shown</span></div>
            <div className="foundry-table-scroll"><table className="foundry-table"><thead><tr><th>Case</th><th>Project</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>Actions</th></tr></thead><tbody>
              {workspace.cases.map((operationalCase) => <tr key={operationalCase.id}><td><strong>{operationalCase.title}</strong><small>{operationalCase.id}</small></td><td>{workspace.projects.find((project) => project.id === operationalCase.projectId)?.name ?? "—"}</td><td>{operationalCase.priority}</td><td><span className="foundry-status-pill">{operationalCase.status.replaceAll("_", " ")}</span></td><td>{workspace.employees.find((employee) => employee.id === operationalCase.assignedEmployeeId)?.name ?? "Unassigned"}</td><td><div className="foundry-action-stack">{["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(current.session.role) && ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL"].includes(operationalCase.status) && workspace.employees.length > 0 && <form action={assignFoundryCaseAction} className="foundry-inline-form"><input type="hidden" name="caseId" value={operationalCase.id} /><select aria-label={`Assign ${operationalCase.title} to`} name="employeeId" defaultValue={operationalCase.assignedEmployeeId ?? workspace.employees[0].id}>{workspace.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><button type="submit">Assign</button></form>}{["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(current.session.role) && ["OPEN", "IN_PROGRESS"].includes(operationalCase.status) && <form action={resolveFoundryCaseAction}><input type="hidden" name="caseId" value={operationalCase.id} /><button className="foundry-quiet-button" type="submit">Resolve</button></form>}</div></td></tr>)}
              {!workspace.cases.length && <tr><td colSpan={6} className="foundry-empty-cell">No operational cases are visible to this Foundry account.</td></tr>}
            </tbody></table></div>
            {workspace.hasMore.cases && <p className="foundry-list-note">Showing the first 500 of {workspace.totals.cases.toLocaleString()} cases.</p>}
          </section>
          <details className="foundry-data-section foundry-readonly-sections"><summary>Customers, people, teams, and approvals</summary>
            <div className="foundry-secondary-grid">
              <div><h3>Customers</h3>{workspace.customers.map((customer) => <p key={customer.id}><strong>{customer.name}</strong><small>{customer.industry} · {customer.status}</small></p>)}</div>
              <div><h3>Employees</h3>{workspace.employees.map((employee) => <p key={employee.id}><strong>{employee.name}</strong><small>{employee.role} · {workspace.teams.find((team) => team.id === employee.teamId)?.name ?? "No team"}</small></p>)}</div>
              <div><h3>Teams</h3>{workspace.teams.map((team) => <p key={team.id}><strong>{team.name}</strong><small>{team.department}</small></p>)}</div>
              <div><h3>Approvals · read only</h3>{workspace.approvals.map((approval) => <p key={approval.id}><strong>{approval.id} · {approval.status}</strong><small>Case {approval.caseId ?? "—"} · requester {approval.requestedBy ?? "—"}</small></p>)}</div>
            </div>
          </details>
          {Object.values(workspace.hasMore).some(Boolean) && <p className="foundry-list-note">List previews are capped at 500 records per type; total counts come from the Ontology query.</p>}
        </section>}
      </div>
    </main>
  );
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ foundry?: string }> }) {
  if (getDataProviderMode() === "foundry") return <FoundryProviderSetup searchParams={searchParams} />;

  // Keep the Neon auth/database module graph out of the Foundry setup path.
  const NeonHome = (await import("./neon-home")).default;
  return <NeonHome />;
}
