import AppShell from "@/components/AppShell";
import { serverClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await serverClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [roles, pipeline, runs] = await Promise.all([
    supabase.from("roles").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("applications").select("role_id", { count: "exact", head: true }),
    supabase.from("source_runs").select("source_name").gte("ran_at", since).limit(5000),
  ]);
  const sources = new Set((runs.data ?? []).map((r) => r.source_name)).size;
  return <AppShell counts={{ roles: roles.count ?? 0, pipeline: pipeline.count ?? 0, sources }}>{children}</AppShell>;
}
