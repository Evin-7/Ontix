import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ErrorToast } from "@/components/ui/error-toast";
import { getCurrentDemoSession, isDemoAuthenticationConfigured } from "@/server/providers/demo/auth";
import { WorkspaceLoginForm } from "./workspace-login-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Explore the Ontix workspace", robots: { index: false, follow: false } };

const errors: Record<string, string> = {
  invalid: "Those details didn’t match. Check them and try again.",
  "rate-limited": "Too many attempts. Please wait a little and try again.",
  unavailable: "Workspace access is not available right now. Please try again later.",
};

export default async function WorkspaceLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const current = await getCurrentDemoSession();
  if (current.session) redirect("/overview");
  const params = await searchParams;
  const message = !isDemoAuthenticationConfigured()
    ? "Workspace access is not configured on this deployment."
    : params?.error ? errors[params.error] : undefined;

  return <main className="grid min-h-screen grid-rows-[auto_1fr_auto] items-center justify-items-center bg-background px-5 py-6 pt-[clamp(24px,6vw,72px)] text-center">
    <div className="grid w-full max-w-[900px] grid-cols-[1fr_auto_1fr] items-center">
      <span aria-hidden="true" />
      <Link className="flex items-center justify-self-center" href="/" aria-label="Ontix sign-in"><OntixLogo size="medium" /></Link>
      <div className="justify-self-end"><ThemeToggle /></div>
    </div>
    <section className="my-[30px] w-full max-w-[440px] self-center rounded-2xl border border-border bg-surface p-[clamp(26px,5vw,40px)] text-center shadow-[var(--shadow-md)]">
      <div className="text-[11px] font-[750] tracking-[.13em] text-primary">READ-ONLY WORKSPACE</div>
      <h1 className="mt-[10px] mb-[7px] text-[29px] font-bold tracking-[-.04em] text-foreground">Explore Ontix</h1>
      <ErrorToast message={message} clearQueryParams={["error"]} />
      <WorkspaceLoginForm enabled={isDemoAuthenticationConfigured()} />
      <Link className="mt-[22px] block text-center text-xs text-muted no-underline hover:text-primary" href="/">Back to sign in</Link>
    </section>
  </main>;
}
