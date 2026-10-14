import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getCurrentDemoSession, isDemoAuthenticationConfigured } from "@/server/providers/demo/auth";
import { DemoPasswordField } from "./demo-password-field";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Explore the Ontix demo", robots: { index: false, follow: false } };

const errors: Record<string, string> = {
  invalid: "Those details didn’t match. Check them and try again.",
  "rate-limited": "Too many attempts. Please wait a little and try again.",
  unavailable: "Demo sign-in is not available right now. Please try again later.",
};

export default async function DemoLoginPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
  const current = await getCurrentDemoSession();
  if (current.session) redirect("/overview");
  const params = await searchParams;
  const message = !isDemoAuthenticationConfigured()
    ? "Demo sign-in is not configured on this deployment."
    : params?.error ? errors[params.error] : undefined;

  return <main className="login-page demo-login-page">
    <div className="login-header">
      <span aria-hidden="true" />
      <Link className="login-brand" href="/" aria-label="Ontix sign-in"><OntixLogo size="medium" /></Link>
      <ThemeToggle />
    </div>
    <section className="login-card demo-login-card">
      <div className="login-kicker">DEMO WORKSPACE</div>
      <h1>Explore Ontix</h1>
      <p className="login-intro">Sign in to explore fictional sample records. Editing is unavailable in demo mode.</p>
      {message && <p className="login-error" role="alert">{message}</p>}
      <form className="login-form" action="/api/demo/sign-in" method="post">
        <label className="field">
          <span>Username</span>
          <input name="username" type="text" autoComplete="username" required minLength={3} maxLength={254} />
        </label>
        <div className="field">
          <label htmlFor="demo-password">Password</label>
          <DemoPasswordField />
        </div>
        <button className="button button-primary login-submit" type="submit" disabled={!isDemoAuthenticationConfigured()}>
          Explore Demo <span aria-hidden="true">→</span>
        </button>
      </form>
      <Link className="demo-login-back" href="/">Back to sign in</Link>
    </section>
  </main>;
}
