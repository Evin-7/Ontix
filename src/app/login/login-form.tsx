"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      callbackURL: "/",
    });
    setPending(false);
    if (result.error) {
      setError("Sign in failed. Check your credentials or contact your administrator.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="field">
        <span>Work email</span>
        <input name="email" type="email" autoComplete="username" placeholder="you@company.com" required maxLength={254} />
      </label>
      <label className="field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required minLength={12} maxLength={128} />
      </label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button className="button button-primary login-submit" type="submit" disabled={pending}>
        {pending ? <><LoaderCircle size={17} className="spin" /> Signing in…</> : <>Sign in to Ontix <ArrowRight size={17} /></>}
      </button>
      <div className="login-security"><ShieldCheck size={16} /><span>Secure workspace access · Accounts are provisioned by an administrator</span></div>
    </form>
  );
}
