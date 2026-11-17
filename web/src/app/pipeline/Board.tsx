"use client";
import Link from "next/link";
import { useState } from "react";
import { STAGES, canMove, groupByStage, type Stage } from "@/lib/stages";
import { browserClient } from "@/lib/supabase/client";

export type Card = {
  role_id: string;
  stage: string;
  roles: { title: string; company: string; city: string | null; url: string } | null;
};

export default function Board({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [error, setError] = useState("");
  const groups = groupByStage(cards);

  async function move(card: Card, to: Stage) {
    if (!canMove(card.stage as Stage, to)) return;
    setError("");
    const patch: Record<string, string> = { stage: to, updated_at: new Date().toISOString() };
    if (to === "applied") patch.applied_at = new Date().toISOString();
    const { error: err } = await browserClient().from("applications").update(patch).eq("role_id", card.role_id);
    if (err) return setError("Could not move that card. Try again.");
    setCards(cards.map((c) => (c.role_id === card.role_id ? { ...c, stage: to } : c)));
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div className="board">
        {STAGES.map((stage) => (
          <section className="col" key={stage}>
            <h2>{stage} ({groups[stage].length})</h2>
            {groups[stage].map((c) => (
              <div className="card" key={c.role_id}>
                <Link href={`/roles/${c.role_id}`}>{c.roles?.title ?? "Role"}</Link>
                <div className="muted">{c.roles?.company} {c.roles?.city ? `, ${c.roles.city}` : ""}</div>
                <select aria-label="Move to stage" value={c.stage} onChange={(e) => move(c, e.target.value as Stage)}>
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
