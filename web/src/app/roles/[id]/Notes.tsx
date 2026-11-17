"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export default function Notes(props: { roleId: string; notes: string; assessment: string; appliedAt: string }) {
  const [notes, setNotes] = useState(props.notes);
  const [assessment, setAssessment] = useState(props.assessment);
  const [applied, setApplied] = useState(props.appliedAt);
  const [status, setStatus] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await browserClient()
      .from("applications")
      .update({
        notes,
        assessment_type: assessment || null,
        applied_at: applied ? new Date(applied).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("role_id", props.roleId);
    setStatus(error ? "Could not save." : "Saved.");
  }

  return (
    <form onSubmit={save}>
      <label htmlFor="assessment">Assessment type (for example case interview, numerical test)</label>
      <input id="assessment" value={assessment} onChange={(e) => setAssessment(e.target.value)} />
      <label htmlFor="applied">Applied on</label>
      <input id="applied" type="date" value={applied} onChange={(e) => setApplied(e.target.value)} />
      <label htmlFor="notes">Notes</label>
      <textarea id="notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button type="submit">Save</button>
      {status && <p role="status">{status}</p>}
    </form>
  );
}
