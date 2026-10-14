import Link from "next/link";
import { House, SearchX } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { OntixLogo } from "@/components/branding/ontix-logo";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center bg-background p-6">
      <div className="absolute top-5 right-6"><ThemeToggle /></div>
      <section className="flex w-full max-w-[500px] flex-col items-start rounded-2xl border border-border bg-surface p-[clamp(24px,5vw,38px)] shadow-[var(--shadow-md)]">
        <div className="mb-7 flex items-center"><OntixLogo size="small" /></div>
        <span className="mb-4 grid size-12 place-items-center rounded-[13px] text-info bg-[color-mix(in_srgb,var(--info)_12%,var(--surface))]"><SearchX size={24} /></span>
        <p className="mb-[7px] text-[11px] font-bold tracking-[.12em] text-muted">404 · NOT FOUND</p>
        <h1 className="m-0 text-[25px] font-bold tracking-[-.03em] text-foreground">Page not found</h1>
        <p className="mt-[9px] text-sm leading-[1.6] text-muted">This address doesn’t point to a page in your Ontix workspace.</p>
        <div className="mt-6 flex flex-wrap gap-[9px] max-[520px]:w-full max-[520px]:[&>*]:flex-1">
          <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-primary bg-primary px-3.5 text-[13px] font-semibold text-white shadow-sm transition active:translate-y-px hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-hover dark:text-[#0b1220]" href="/"><House size={16} /> Go to dashboard</Link>
          <BackButton />
        </div>
      </section>
    </main>
  );
}
