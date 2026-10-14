"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[Ontix] Workspace module failed", { digest: error.digest });
  }, [error.digest]);
  return (
    <section className="mx-auto my-[9vh] grid max-w-[530px] justify-items-start rounded-[14px] border border-border bg-surface p-[30px] shadow-[var(--shadow-sm)]" role="alert">
      <span className="grid size-[38px] place-items-center rounded-[9px] bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))] text-warning"><AlertTriangle size={19} aria-hidden="true" /></span>
      <p className="mt-[18px] mb-0 text-[9px] font-bold tracking-[.13em] text-muted">WORKSPACE STATUS</p>
      <h1 className="my-[7px] text-[22px] font-semibold tracking-[-.04em]">This workspace view is temporarily unavailable</h1>
      <p className="mb-[18px] mt-0 text-xs leading-[1.65] text-muted">We couldn’t load this view. Your session is still active. Try again in a moment.</p>
      <div><Button onClick={() => { reset(); router.refresh(); }}><RefreshCw size={15} aria-hidden="true" /> Retry</Button></div>
    </section>
  );
}
