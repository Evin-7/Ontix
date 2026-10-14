import { redirect } from "next/navigation";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";
import { getDataProviderMode } from "@/server/providers/provider-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const signInMessages: Record<string, string> = {
  "setup-required": "Foundry sign-in is not ready. Check the server setup details below.",
  "demo-unavailable": "Demo sign-in is not available right now. Please try again later.",
  "access-denied": "Your Foundry account is not assigned to a configured Ontix access group.",
  failed: "We couldn’t complete sign-in. Please try again.",
  denied: "Foundry sign-in was cancelled.",
  "action-failed": "Unable to save changes. Please try again.",
};

const setupReasons: Record<string, string> = {
  "missing-config": "A required server setting is missing. Check the Foundry OAuth, session-store, encryption-key, and access-group configuration.",
  "invalid-config": "A production setting has an invalid format. Check the application URL, callback URL, Redis endpoint, and role-group mapping.",
  "invalid-encryption-key": "The token encryption key is not a valid 32-byte key. Changing it invalidates existing sessions.",
  "redis-connection-failed": "The session store could not be reached. Check the server-side Upstash configuration.",
  "redis-state-write-failed": "The session store could not save temporary OAuth state. Check the Upstash write configuration.",
  "redis-operation-failed": "The session store operation failed. Check its server-side configuration.",
  unexpected: "An unexpected sign-in setup error occurred. Check the safe diagnostic category in server logs.",
};

async function FoundrySignIn({ searchParams }: { searchParams?: Promise<{ foundry?: string; reason?: string }> }) {
  let current = null;
  let sessionProblem = false;
  try {
    current = await getOntixDashboardSession();
  } catch {
    sessionProblem = true;
  }
  // In particular, discard stale OAuth failure parameters once a valid
  // session has been established.
  if (current) redirect("/overview");

  const params = await searchParams;
  const foundry = params?.foundry;
  const message = sessionProblem
    ? "Foundry access could not be checked right now. Your browser session was not changed; try again shortly."
    : foundry === "setup-required"
      ? setupReasons[params?.reason ?? ""] ?? signInMessages[foundry]
      : foundry ? signInMessages[foundry] : undefined;

  return (
    <main className="foundry-login-page">
      <section className="foundry-login-visual" aria-label="Ontix operations platform">
        <OntixLogo theme="dark" size="large" />
        <div className="foundry-login-story">
          <h1>Operations,<br />simplified.</h1>
          <p>Your operations. One connected workspace.</p>
        </div>
      </section>
      <section className="foundry-login-content">
        <div className="foundry-login-card">
          <div className="foundry-login-mobile-brand"><OntixLogo size="medium" /></div>
          <h2>Sign in to Ontix</h2>
          <p className="foundry-login-copy">Sign in securely to continue.</p>
          {message && <p className="foundry-login-alert" role="status">{message}</p>}
          <div className="foundry-login-actions">
            <a className="button button-primary foundry-login-button" href="/api/foundry/sign-in">Continue with Palantir Foundry</a>
            <a className="button button-secondary foundry-demo-button" href="/demo-login">Explore Demo</a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<{ foundry?: string; reason?: string }> }) {
  if (getDataProviderMode() === "foundry") return <FoundrySignIn searchParams={searchParams} />;
  const NeonHome = (await import("./neon-home")).default;
  return <NeonHome />;
}
