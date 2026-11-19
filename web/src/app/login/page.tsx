"use client";
import { useEffect, useState } from "react";
import { loginMessage, type LoginProblem } from "@/lib/loginMessage";
import { browserClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [problem, setProblem] = useState<LoginProblem>(null);

  useEffect(() => {
    // the callback page sends people back here with ?error=link when a sign in link could not be used
    const page = new URLSearchParams(location.search).get("error");
    if (page) setProblem({ page });
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setProblem(null);
    const { error } = await browserClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setProblem({ status: error.status, code: error.code });
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
        {loginMessage(problem) && <p className="alert" role="alert">{loginMessage(problem)}</p>}
      </section>
    </main>
  );
}
