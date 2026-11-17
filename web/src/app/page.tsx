import { serverClient } from "@/lib/supabase/server";
import RoleTable from "./roles/RoleTable";
import type { RoleRow } from "@/lib/filters";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await serverClient();
  const [{ data: roles }, { data: apps }] = await Promise.all([
    supabase
      .from("roles")
      .select("id,company,title,city,country,field_tag,level_tag,matched,status,first_seen,url")
      .eq("status", "open")
      .order("first_seen", { ascending: false })
      .limit(3000),
    supabase.from("applications").select("role_id"),
  ]);
  return (
    <main>
      <h1>New roles</h1>
      <RoleTable roles={(roles ?? []) as RoleRow[]} savedIds={(apps ?? []).map((a) => a.role_id)} />
    </main>
  );
}
