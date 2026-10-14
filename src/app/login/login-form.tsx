"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/notifications";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.namedItem("email") as HTMLInputElement;
    const password = form.elements.namedItem("password") as HTMLInputElement;
    if (!email.value.trim()) {
      notify.error({ title: "Enter your work email." });
      email.focus();
      return;
    }
    if (!email.validity.valid) {
      notify.error({ title: "Enter a valid work email address." });
      email.focus();
      return;
    }
    if (!password.value) {
      notify.error({ title: "Enter your password." });
      password.focus();
      return;
    }
    if (!password.validity.valid) {
      notify.error({ title: "Your password must be at least 12 characters." });
      password.focus();
      return;
    }
    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: email.value.trim(),
        password: password.value,
        callbackURL: "/",
      });
      if (result.error) {
        const message = "Sign in could not be completed. Check your details or contact your administrator.";
        notify.error({ title: message });
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      const message = "The service could not be reached. Check your connection and try again.";
      notify.error({ title: message });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <label className="grid gap-[7px] text-[13px] font-medium text-foreground">
        <span className="text-[13px] font-semibold text-foreground">Work email</span>
        <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-[11px] text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/15" name="email" type="email" autoComplete="username" placeholder="you@company.com" required maxLength={254} />
      </label>
      <label className="grid gap-[7px] text-[13px] font-medium text-foreground">
        <span className="text-[13px] font-semibold text-foreground">Password</span>
        <input className="min-h-11 w-full rounded-[var(--radius-control)] border border-border bg-surface px-[11px] text-sm text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary/15" name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={12} maxLength={128} />
      </label>
      <button className="mt-[2px] flex min-h-11 w-full items-center justify-center gap-[9px] rounded-[var(--radius-control)] border border-primary bg-primary px-3.5 text-sm font-semibold text-white shadow-sm transition active:translate-y-px hover:not-disabled:border-primary-hover hover:not-disabled:bg-primary-hover disabled:cursor-not-allowed dark:text-[#0b1220]" type="submit" disabled={pending}>
        {pending ? <><LoaderCircle size={17} className="animate-spin" /> Signing in…</> : <>Sign in to Ontix <ArrowRight size={17} /></>}
      </button>
      <div className="flex items-start gap-2 pt-[3px] text-xs leading-[1.5] text-muted"><ShieldCheck size={16} className="shrink-0 text-success" /><span>Secure workspace access · Accounts are provisioned by an administrator</span></div>
    </form>
  );
}
