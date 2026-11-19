import Link from "next/link";
import { serverClient } from "@/lib/supabase/server";
import Board, { type Card } from "./Board";

export const dynamic = "force-dynamic";

export default async function Pipeline() {
  const supabase = await serverClient();
  const { data } = await supabase
    .from("applications")
    .select("role_id,stage,roles(title,company,city,country,url)")
    .order("updated_at", { ascending: false });
  const cards = (data ?? []) as unknown as Card[];
  return (
    <>
      <div className="head">
        <div>
          <h1>Pipeline</h1>
          <p>{cards.length ? `${cards.length} ${cards.length === 1 ? "role" : "roles"} in progress.` : "Move roles from Saved to Offer as things happen."}</p>
        </div>
      </div>
      {cards.length ? (
        <Board initial={cards} />
      ) : (
        <div className="panel empty">
          <strong>Your pipeline is empty</strong>
          <span>Open a role and pick a stage. It appears here straight away.</span>
          <Link className="btn primary" href="/roles">Browse roles</Link>
        </div>
      )}
    </>
  );
}
