"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await browserClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="login">
      <section className="panel">
        <div className="brand" style={{ padding: 0 }}>
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12.5 6 8l3 2.5L14 4" />
              <path d="M10.5 4H14v3.5" />
            </svg>
          </span>
          Job tracker
        </div>
        <div>
          <h1 style={{ fontSize: 22 }}>Sign in</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>We email you a one time link. No password needed.</p>
        </div>
        <form onSubmit={send}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn primary" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Sending" : "Email me a sign in link"}
          </button>
        </form>
        {state === "sent" && <p className="status" role="status">Check your inbox for the link.</p>}
        {state === "error" && <p className="alert" role="alert">That email cannot sign in. Use the owner email set up in Supabase.</p>}
      </section>
    </main>
  );
}
