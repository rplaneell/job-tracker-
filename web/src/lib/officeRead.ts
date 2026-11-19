/** The small part of the Supabase client the office read needs, so tests can stand in for it. */
export interface OfficeQuery extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  select(columns: string): OfficeQuery;
  eq(column: string, value: unknown): OfficeQuery;
  gte(column: string, value: unknown): OfficeQuery;
  order(column: string, options?: { ascending: boolean }): OfficeQuery;
  limit(n: number): OfficeQuery;
}
export interface OfficeClient {
  from(table: string): OfficeQuery;
}

const NEW_ROLE_DAYS = 3;

async function read(query: OfficeQuery, table: string): Promise<unknown[]> {
  const { data, error } = await query;
  if (error) throw new Error(`could not read ${table}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Everything the 3D office shows, read with the signed in owner's own session (so the owner only rules apply).
 * Every read is capped. The office checks and cleans each row itself.
 */
export async function readOffice(client: OfficeClient, now: Date) {
  const since = new Date(now.getTime() - NEW_ROLE_DAYS * 86_400_000).toISOString();
  const [tasks, verdicts, versions, applications, newRoles] = await Promise.all([
    read(client.from("agent_tasks").select("id,kind,status,claimed_at,created_at,finished_at").order("created_at", { ascending: false }).limit(200), "agent_tasks"),
    read(client.from("scout_verdicts").select("role_id,score,reason,shortlisted,roles(title,company)").order("created_at", { ascending: false }).limit(200), "scout_verdicts"),
    read(client.from("cv_versions").select("id,status,roles(title,company)").order("created_at", { ascending: false }).limit(50), "cv_versions"),
    read(client.from("applications").select("stage,applied_at,roles(title,company)").limit(500), "applications"),
    read(client.from("roles").select("city").eq("matched", true).eq("status", "open").gte("first_seen", since).limit(500), "roles"),
  ]);
  return { now: now.toISOString(), tasks, verdicts, versions, applications, newRoles };
}
