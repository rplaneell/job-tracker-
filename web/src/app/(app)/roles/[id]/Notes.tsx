"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function Notes(props: { roleId: string; notes: string; assessment: string; appliedAt: string }) {
  const [notes, setNotes] = useState(props.notes);
  const [assessment, setAssessment] = useState(props.assessment);
  const [applied, setApplied] = useState(props.appliedAt);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const { error } = await browserClient()
      .from("applications")
      .update({
        notes,
        assessment_type: assessment || null,
        applied_at: applied ? new Date(applied).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("role_id", props.roleId);
    setState(error ? "error" : "saved");
  }

  return (
    <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
      <div className="field">
        <label htmlFor="assessment">Assessment type</label>
        <input id="assessment" placeholder="For example case interview or numerical test" value={assessment}
          onChange={(e) => { setAssessment(e.target.value); setState("idle"); }} />
      </div>
      <div className="field">
        <label htmlFor="applied">Applied on</label>
        <input id="applied" type="date" value={applied} onChange={(e) => { setApplied(e.target.value); setState("idle"); }} />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes</label>
        <textarea id="notes" rows={8} value={notes} onChange={(e) => { setNotes(e.target.value); setState("idle"); }} />
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={state === "saving"}>{state === "saving" ? "Saving" : "Save notes"}</button>
      </div>
      {state === "saved" && <p className="status" role="status">Saved.</p>}
      {state === "error" && <p className="alert" role="alert">That did not save. Check your connection and try again.</p>}
    </form>
  );
}
