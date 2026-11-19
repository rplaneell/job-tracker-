"use client";
import { useEffect, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { loginMessage } from "@/lib/loginMessage";

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function Login() {
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // the callback page sends people back here with ?error=... when sign in did not finish
    setProblem(new URLSearchParams(location.search).get("error"));
  }, []);

  async function withGitHub() {
    setBusy(true);
    setProblem(null);
    const { error } = await browserClient().auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setProblem("start");
      setBusy(false);
    }
  }

  const message = loginMessage(problem);
  return (
    <main className="login">
      <div className="login-body">
        <p className="login-name">Job tracker</p>
        <h1>Sign in</h1>
        <p className="login-lede">Your roles, applications and CVs. One owner, no one else gets in.</p>
        <button className="login-provider" type="button" onClick={withGitHub} disabled={busy}>
          <GitHubMark />
          {busy ? "Opening GitHub" : "Continue with GitHub"}
        </button>
        {message && <p className="alert" role="alert">{message}</p>}
      </div>
    </main>
  );
}
