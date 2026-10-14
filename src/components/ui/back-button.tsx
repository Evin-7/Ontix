"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ className = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface-muted px-4 text-sm font-medium text-foreground transition-colors hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.back()}>
      <ArrowLeft size={16} /> Go back
    </button>
  );
}
