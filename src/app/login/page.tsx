import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";
import { getDataProviderMode } from "@/server/providers/provider-mode";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ontix | Enterprise Operations Platform",
  description: "Connected Data. Smarter Operations.",
};

export default function LoginPage() {
  if (getDataProviderMode() === "foundry") redirect("/");

  return (
    <main className="login-page">
      <div className="login-header">
        <span aria-hidden="true" />
        <div className="login-brand">
          <OntixLogo size="medium" />
        </div>
        <ThemeToggle />
      </div>
      <section className="login-card">
        <div className="login-kicker">OPERATIONS WORKSPACE</div>
        <h1>Welcome back</h1>
        <LoginForm />
      </section>
      <p className="login-footnote">Connected Data. Smarter Operations.</p>
    </main>
  );
}
