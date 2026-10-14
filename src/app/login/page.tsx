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
    <main className="grid min-h-screen grid-rows-[auto_1fr_auto] items-center justify-items-center bg-background px-5 py-6 pt-[clamp(24px,6vw,72px)]">
      <div className="grid w-full max-w-[900px] grid-cols-[1fr_auto_1fr] items-center">
        <span aria-hidden="true" />
        <div className="flex items-center justify-self-center">
          <OntixLogo size="medium" />
        </div>
        <div className="justify-self-end"><ThemeToggle /></div>
      </div>
      <section className="my-[30px] w-full max-w-[440px] self-center rounded-2xl border border-border bg-surface p-[clamp(26px,5vw,40px)] shadow-[var(--shadow-md)]">
        <div className="text-[11px] font-[750] tracking-[.13em] text-primary">OPERATIONS WORKSPACE</div>
        <h1 className="mt-[10px] mb-[7px] text-[29px] font-bold tracking-[-.04em] text-foreground">Welcome back</h1>
        <LoginForm />
      </section>
      <p className="m-0 text-[11px] tracking-[.03em] text-muted">Connected Data. Smarter Operations.</p>
    </main>
  );
}
