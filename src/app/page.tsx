import { redirect } from "next/navigation";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { ErrorToast } from "@/components/ui/error-toast";
import { getOntixDashboardSession } from "@/server/providers/ontix/dashboard-context";
import { getDataProviderMode } from "@/server/providers/provider-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const signInMessages: Record<string, string> = {
  "setup-required": "Foundry sign-in is not ready. Check the server setup details below.",
  "demo-unavailable": "Workspace access is not available right now. Please try again later.",
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
    <main className="grid min-h-dvh grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] bg-surface max-[760px]:grid-cols-1">
      <section className="flex min-h-dvh flex-col justify-between bg-[radial-gradient(ellipse_at_25%_80%,rgb(79_70_229_/_0.25),transparent_42%),linear-gradient(150deg,#0d1424_3%,#121a2b_62%,#101628)] p-[clamp(32px,6vw,76px)] text-slate-50 max-[760px]:hidden" aria-label="Ontix operations platform">
        <OntixLogo theme="dark" size="large" />
        <div className="my-auto max-w-[620px] py-20">
          <h1 className="mb-5 text-[clamp(42px,5.2vw,70px)] font-semibold leading-[1.02] tracking-[-0.06em]">Operations,<br />simplified.</h1>
          <p className="max-w-[470px] text-[17px] leading-[1.65] text-[#bdc8da]">Your operations. One connected workspace.</p>
        </div>
      </section>
      <section className="grid min-h-dvh place-items-center bg-surface p-9 dark:bg-background max-[760px]:p-[25px]">
        <div className="w-full max-w-[420px]">
          <div className="mb-11 hidden max-[760px]:mb-[55px] max-[760px]:block"><OntixLogo size="medium" /></div>
          <h2 className="mb-2 text-center text-[30px] font-semibold tracking-[-0.04em]">Sign in to Ontix</h2>
          <ErrorToast message={message} clearQueryParams={["foundry", "reason"]} />
          <div className="mt-7 grid gap-3">
            <a className="mt-0 flex min-h-12 w-full items-center justify-center rounded-[9px] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/api/foundry/sign-in">Continue with Palantir Foundry</a>
            <a className="mt-0 flex min-h-11 w-full items-center justify-center rounded-[9px] border border-border bg-surface px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/workspace-login">Explore workspace</a>
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
