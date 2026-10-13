"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ className = "button button-secondary" }: { className?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={className} onClick={() => router.back()}>
      <ArrowLeft size={16} /> Go back
    </button>
  );
}
