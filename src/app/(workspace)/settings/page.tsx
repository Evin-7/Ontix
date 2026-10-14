import { redirect } from "next/navigation";
import { KeyRound, Palette, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ThemePreferences } from "@/components/foundry/theme-preferences";
import { getFoundryModuleContext } from "@/server/providers/foundry/dashboard-context";
import { getFoundryOAuthConfig } from "@/server/providers/foundry/config";

export default async function SettingsPage() {
  const context = await getFoundryModuleContext("overview");
  if (!context) redirect("/");
  const config = getFoundryOAuthConfig();
  const writesProjects = ["ADMINISTRATOR", "MANAGER"].includes(context.session.role);
  const writesCases = ["ADMINISTRATOR", "MANAGER", "DEVELOPER"].includes(context.session.role);
  const typeCount = Object.values(context.workspace.totals).filter((count) => count >= 0).length;
  const checkedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(context.workspace.checkedAt));

  return <div className="foundry-module-page">
    <PageHeader eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Review your Ontix access, appearance, and live Foundry connection." />
    <div className="foundry-settings-grid">
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Profile & access</h2><p>Role is mapped from your current Foundry group membership.</p></div></div>
        <dl className="foundry-settings-details"><div><dt>Identity</dt><dd>Authenticated Foundry user</dd></div><div><dt>Ontix role</dt><dd><span className="foundry-role-chip">{context.session.role.replaceAll("_", " ")}</span></dd></div><div><dt>Session expires</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(context.session.expiresAt))}</dd></div></dl>
      </section>
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Palette size={18} /></span><div><h2>Appearance</h2><p>Choose a theme for this browser. System follows device settings.</p></div></div>
        <ThemePreferences />
      </section>
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><Server size={18} /></span><div><h2>Foundry connection</h2><p>Connection details are checked server-side and do not expose credentials.</p></div><span className="foundry-settings-status"><i /> Connected</span></div>
        <dl className="foundry-settings-details"><div><dt>Foundry instance</dt><dd>{config.stackUrl.hostname}</dd></div><div><dt>Last successful read</dt><dd>{checkedAt}</dd></div><div><dt>Ontology records read</dt><dd>{typeCount} object types · {Object.values(context.workspace.totals).reduce((sum, count) => sum + count, 0).toLocaleString()} total rows visible</dd></div></dl>
      </section>
      <section className="foundry-settings-card">
        <div className="foundry-settings-card-heading"><span><KeyRound size={18} /></span><div><h2>Capabilities</h2><p>Ontix role gates which actions the interface offers. Foundry remains authoritative for action permissions.</p></div></div>
        <ul className="foundry-capability-list"><li><span>Read visible Ontology records</span><strong>Available</strong></li><li><span>Update project status</span><strong>{writesProjects ? "Role permits" : "Read only"}</strong></li><li><span>Assign or resolve cases</span><strong>{writesCases ? "Role permits" : "Read only"}</strong></li><li><span>Approval decisions</span><strong>Not configured · read only</strong></li></ul>
      </section>
      <section className="foundry-settings-card foundry-security-card">
        <div className="foundry-settings-card-heading"><span><ShieldCheck size={18} /></span><div><h2>Security</h2><p>Access tokens and session encryption keys remain on the server.</p></div></div>
        <p className="foundry-security-copy">Your session uses encrypted server-side storage. Sign out to revoke this Ontix session.</p>
        <form action="/api/foundry/sign-out" method="post"><button className="foundry-security-signout" type="submit">Sign out of Ontix</button></form>
      </section>
    </div>
  </div>;
}
