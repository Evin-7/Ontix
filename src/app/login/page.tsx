import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign in · Ontix",
  description: "Sign in to the Ontix operations workspace.",
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-header">
        <span aria-hidden="true" />
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-word">ONTIX</span>
        </div>
        <ThemeToggle />
      </div>
      <section className="login-card">
        <div className="login-kicker">OPERATIONS WORKSPACE</div>
        <h1>Welcome back</h1>
        <p className="login-intro">Sign in to continue to your customer, delivery, and service operations.</p>
        <LoginForm />
      </section>
      <p className="login-footnote">Connected Data. Smarter Operations.</p>
    </main>
  );
}
