import { serverClient } from "@/lib/supabase/server";
import Board, { type Card } from "./Board";

export const dynamic = "force-dynamic";

export default async function Pipeline() {
  const supabase = await serverClient();
  const { data } = await supabase
    .from("applications")
    .select("role_id,stage,roles(title,company,city,url)")
    .order("updated_at", { ascending: false });
  return (
    <main>
      <h1>Pipeline</h1>
      <Board initial={(data ?? []) as unknown as Card[]} />
    </main>
  );
}
