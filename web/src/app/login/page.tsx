"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await browserClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setState(error ? "error" : "sent");
  }

  return (
    <main className="narrow">
      <h1>Job tracker</h1>
      <form onSubmit={send}>
        <label htmlFor="email">Your email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit">Email me a login link</button>
      </form>
      {state === "sent" && <p>Check your inbox for the link.</p>}
      {state === "error" && <p role="alert">That did not work. Is this the owner email?</p>}
    </main>
  );
}
