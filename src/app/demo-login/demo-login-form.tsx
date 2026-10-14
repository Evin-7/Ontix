"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { notify } from "@/lib/notifications";
import { DemoPasswordField } from "./demo-password-field";

export function DemoLoginForm({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const username = form.elements.namedItem("username") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    if (pendingRef.current) {
      event.preventDefault();
      return;
    }
    if (!username.value.trim()) {
      event.preventDefault();
      notify.error({ title: "Enter your username." });
      username.focus();
      return;
    }
    if (username.value.trim().length < 3) {
      event.preventDefault();
      notify.error({ title: "Enter a valid username." });
      username.focus();
      return;
    }
    if (!password.value) {
      event.preventDefault();
      notify.error({ title: "Enter your password." });
      password.focus();
      return;
    }
    pendingRef.current = true;
    setPending(true);
  }

  return (
    <form className="grid gap-4 text-left" action="/api/demo/sign-in" method="post" onSubmit={handleSubmit} noValidate>
      <label className="grid gap-[7px] text-[13px] font-medium text-foreground">
        <span className="text-[13px] font-semibold text-foreground">Username</span>
        <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-[11px] text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/15" name="username" type="text" autoComplete="username" required minLength={3} maxLength={254} />
      </label>
      <div className="grid gap-[7px] text-[13px] font-medium text-foreground">
        <label htmlFor="demo-password" className="text-[13px] font-semibold text-foreground">Password</label>
        <DemoPasswordField />
      </div>
      <button className="mt-[2px] flex min-h-11 w-full items-center justify-center gap-[9px] rounded-[var(--radius-control)] border border-primary bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition active:translate-y-px hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-hover disabled:cursor-not-allowed dark:text-[#0b1220]" type="submit" disabled={!enabled || pending} aria-busy={pending || undefined}>
        {pending
          ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Opening demo…</>
          : <>Explore Demo <ArrowRight size={17} aria-hidden="true" /></>}
      </button>
    </form>
  );
}
