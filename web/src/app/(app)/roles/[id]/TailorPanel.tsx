"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ago } from "@/lib/labels";
import { browserClient } from "@/lib/supabase/client";
import type { TailorState } from "@/lib/cvView";

type Version = { id: string; status: string; created_at: string };

export default function TailorPanel({ roleId, hasMaster, state, versions }: { roleId: string; hasMaster: boolean; state: TailorState; versions: Version[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request() {
    setBusy(true);
    setError("");
    const { error: err } = await browserClient()
      .from("agent_tasks")
      .insert({ agent_id: "cv", kind: "tailor_cv", status: "queued", payload: { role_id: roleId } });
    setBusy(false);
    if (err) return setError("That did not save. Check your connection and try again.");
    router.refresh();
  }

  return (
    <section className="panel note">
      <h2>Tailored CV</h2>
      {!hasMaster ? (
        <p>Save your master CV first, then come back. <Link href="/cv">Open Your CV</Link></p>
      ) : state === "ready" ? (
        <>
          <p>Ask for a draft of your CV matched to this role. Nothing is sent anywhere.</p>
          <div className="actions"><button className="btn primary" type="button" onClick={request} disabled={busy}>{busy ? "Requesting" : "Tailor my CV"}</button></div>
        </>
      ) : state === "queued" ? (
        <p>Requested. Open a Claude Code session on this repository and say: <strong>tailor my CV for the queued task</strong>.</p>
      ) : (
        <p>Claude Code is working on it. Refresh in a minute.</p>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
      {versions.length > 0 && (
        <ul>
          {versions.map((v) => (
            <li key={v.id}>
              <Link href={`/cv/${v.id}`}>Draft from {ago(v.created_at)}</Link> <span className={`tag ${v.status === "approved" ? "match" : ""}`}>{v.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
