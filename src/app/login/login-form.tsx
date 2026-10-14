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
    <form className="login-form" onSubmit={submit} noValidate>
      <label className="field">
        <span>Work email</span>
        <input name="email" type="email" autoComplete="username" placeholder="you@company.com" required maxLength={254} />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={12} maxLength={128} />
      </label>
      <button className="button button-primary login-submit" type="submit" disabled={pending}>
        {pending ? <><LoaderCircle size={17} className="spin" /> Signing in…</> : <>Sign in to Ontix <ArrowRight size={17} /></>}
      </button>
      <div className="login-security"><ShieldCheck size={16} /><span>Secure workspace access · Accounts are provisioned by an administrator</span></div>
    </form>
  );
}
