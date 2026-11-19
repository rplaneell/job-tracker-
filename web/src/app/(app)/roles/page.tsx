import { serverClient } from "@/lib/supabase/server";
import { summariseHealth, type SourceRunRow } from "@/lib/health";
import type { RoleRow } from "@/lib/filters";
import RoleTable from "./RoleTable";

export const dynamic = "force-dynamic";

export default async function Roles() {
  const supabase = await serverClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: roles }, { data: apps }, { data: runs }] = await Promise.all([
    supabase
      .from("roles")
      .select("id,source,company,title,city,country,field_tag,level_tag,matched,status,first_seen,posted_at,url")
      .eq("status", "open")
      .order("first_seen", { ascending: false })
      .limit(5000),
    supabase.from("applications").select("role_id,stage"),
    supabase.from("source_runs").select("source_name,ran_at,ok,error").gte("ran_at", since).limit(5000),
  ]);
  const list = (roles ?? []) as RoleRow[];
  const stages = Object.fromEntries((apps ?? []).map((a) => [a.role_id, a.stage as string]));
  const health = summariseHealth((runs ?? []) as SourceRunRow[], new Date());
  const working = health.filter((h) => h.status === "ok").length;

  return (
    <>
      <div className="head">
        <div>
          <h1>Roles</h1>
          <p>Everything found in your five regions. Roles that fit your profile come first.</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="n">{list.length}</div><div className="l">Open roles found</div></div>
        <div className="stat"><div className="n">{list.filter((r) => r.matched).length}</div><div className="l">Fit your profile</div></div>
        <div className="stat"><div className="n">{Object.keys(stages).length}</div><div className="l">In your pipeline</div></div>
        <div className="stat">
          <div className="n">{working}<small>of {health.length}</small></div>
          <div className="l">Sources working</div>
        </div>
      </div>
      <RoleTable roles={list} stages={stages} />
    </>
  );
}
