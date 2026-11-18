"use client";
import Link from "next/link";
import { useState } from "react";
import { where } from "@/lib/labels";
import { STAGES, canMove, groupByStage, type Stage } from "@/lib/stages";
import { browserClient } from "@/lib/supabase/client";

export type Card = {
  role_id: string;
  stage: string;
  roles: { title: string; company: string; city: string | null; country: string | null; url: string } | null;
};

export default function Board({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState(initial);
  const [error, setError] = useState("");
  const groups = groupByStage(cards);

  async function move(card: Card, to: Stage) {
    if (!canMove(card.stage as Stage, to)) return;
    setError("");
    const now = new Date().toISOString();
    const patch: Record<string, string> = { stage: to, updated_at: now };
    if (to === "applied") patch.applied_at = now;
    const { error: err } = await browserClient().from("applications").update(patch).eq("role_id", card.role_id);
    if (err) return setError("That card did not move. Check your connection and try again.");
    setCards(cards.map((c) => (c.role_id === card.role_id ? { ...c, stage: to } : c)));
  }

  return (
    <>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="board">
        {STAGES.map((stage) => (
          <section className="col" key={stage} aria-label={stage}>
            <h2>{stage}<span className="mono">{groups[stage].length}</span></h2>
            {groups[stage].map((c) => (
              <div className="card" key={c.role_id}>
                <Link href={`/roles/${c.role_id}`}>{c.roles?.title ?? "Role"}</Link>
                <div className="c">{c.roles?.company} · {where(c.roles?.city ?? null, c.roles?.country ?? null)}</div>
                <select aria-label={`Move ${c.roles?.title ?? "role"} to another stage`} value={c.stage}
                  onChange={(e) => move(c, e.target.value as Stage)}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
            {groups[stage].length === 0 && <div className="hint">Nothing here yet.</div>}
          </section>
        ))}
      </div>
    </>
  );
}
