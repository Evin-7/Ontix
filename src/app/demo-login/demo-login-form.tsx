"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { DemoPasswordField } from "./demo-password-field";

export function DemoLoginForm({ enabled }: { enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (pendingRef.current) {
      event.preventDefault();
      return;
    }
    pendingRef.current = true;
    setPending(true);
  }

  return (
    <form className="login-form" action="/api/demo/sign-in" method="post" onSubmit={handleSubmit}>
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
