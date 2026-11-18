"use client";
import { useMemo, useState } from "react";
import { CV_LIMITS, parseCvText } from "@/lib/cvText";
import { browserClient } from "@/lib/supabase/client";

const TEMPLATE = `Name: Your Name
Email: you@example.com
Phone: +34 600 000 000
Location: Barcelona, Spain
Links: https://www.linkedin.com/in/your-profile

## Summary
Two sentences about you and what you are looking for.

## Education
### University | Degree | 2025 to 2027
- One true fact per line, for example a thesis topic or relevant course

## Experience
### Organisation | Your role | 2023 to 2024
- One true achievement per line, with real numbers if you have them

## Skills
- Python

## Languages
- English (C1)
`;

export default function CvEditor({ initial }: { initial: string }) {
  const [text, setText] = useState(initial || TEMPLATE);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const result = useMemo(() => parseCvText(text), [text]);

  async function save() {
    if (!result.ok) return;
    setState("saving");
    const { error } = await browserClient().from("cv_master").upsert({ id: true, content: result.cv, updated_at: new Date().toISOString() }, { onConflict: "id" });
    setState(error ? "error" : "saved");
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p className="muted">
        Type your CV in plain text. Start each part with ## and each job or degree with ### Organisation | Title | Dates. One bullet per line.
        Everything stays in your own database. {CV_LIMITS.itemChars} characters per line at most.
      </p>
      <div className="field">
        <label htmlFor="cv-text">Master CV text</label>
        <textarea id="cv-text" rows={22} spellCheck value={text} onChange={(e) => { setText(e.target.value); setState("idle"); }}
          style={{ fontFamily: "var(--mono, monospace)", fontSize: 13 }} />
      </div>
      {!result.ok && (
        <ul className="alert" role="alert" style={{ margin: 0, paddingLeft: 18 }}>
          {result.errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="actions">
        <button className="btn primary" type="button" onClick={save} disabled={!result.ok || state === "saving"}>
          {state === "saving" ? "Saving" : "Save master CV"}
        </button>
      </div>
      {state === "saved" && <p className="status" role="status">Saved.</p>}
      {state === "error" && <p className="alert" role="alert">That did not save. Check your connection and try again.</p>}
    </div>
  );
}
