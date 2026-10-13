import type { Metadata } from "next";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Sign in · Ontix",
  description: "Sign in to the Ontix operations workspace.",
};

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-brand">
        <span className="brand-mark"><span /></span>
        <span className="brand-word">ONTIX</span>
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
