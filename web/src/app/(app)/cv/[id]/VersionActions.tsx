"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function VersionActions({ id, status }: { id: string; status: string; roleId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function approve() {
    setError("");
    const { error: err } = await browserClient().from("cv_versions").update({ status: "approved" }).eq("id", id);
    if (err) return setError("That did not save. Check your connection and try again.");
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("Delete this draft?")) return;
    setError("");
    const { error: err } = await browserClient().from("cv_versions").delete().eq("id", id);
    if (err) return setError("That did not delete. Check your connection and try again.");
    router.replace("/cv");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
      <div className="actions">
        {status !== "approved" && <button className="btn primary" type="button" onClick={approve}>Approve this draft</button>}
        <button className="btn" type="button" onClick={() => window.print()}>Print or save as PDF</button>
        <button className="btn" type="button" onClick={remove}>Delete</button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
    </div>
  );
}
