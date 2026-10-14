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
    <form className="login-form" action="/api/demo/sign-in" method="post" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>Username</span>
        <input name="username" type="text" autoComplete="username" required minLength={3} maxLength={254} />
      </label>
      <div className="field">
        <label htmlFor="demo-password">Password</label>
        <DemoPasswordField />
      </div>
      <button className="button button-primary login-submit" type="submit" disabled={!enabled || pending} aria-busy={pending || undefined}>
        {pending
          ? <><LoaderCircle size={17} className="spin" aria-hidden="true" /> Opening demo…</>
          : <>Explore Demo <ArrowRight size={17} aria-hidden="true" /></>}
      </button>
    </form>
  );
}
