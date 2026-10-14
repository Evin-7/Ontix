import { OntixLogo } from "@/components/branding/ontix-logo";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6" aria-busy="true" aria-live="polite">
      <section className="flex w-full max-w-[500px] flex-col items-center rounded-2xl border border-border bg-surface p-[clamp(24px,5vw,38px)] text-center shadow-[var(--shadow-md)]">
        <OntixLogo size="medium" className="mb-2 animate-pulse" />
        <h1 className="w-full text-[25px] font-bold tracking-[-.03em] text-foreground">Preparing your workspace</h1>
        <p className="w-full text-sm leading-[1.6] text-muted">Checking your secure session.</p>
        <div className="mt-[22px] flex items-center gap-[6px]" aria-hidden="true">
          <span className="size-[5px] animate-pulse rounded-full bg-primary" /><span className="size-[5px] animate-pulse rounded-full bg-primary [animation-delay:150ms]" /><span className="size-[5px] animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
        </div>
        <span className="sr-only">Loading Ontix operations workspace</span>
      </section>
    </main>
  );
}
