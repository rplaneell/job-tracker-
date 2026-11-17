import { serverClient } from "@/lib/supabase/server";
import { summariseHealth, type SourceRunRow } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function Health() {
  const supabase = await serverClient();
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("source_runs")
    .select("source_name,ran_at,ok,error")
    .gte("ran_at", since)
    .order("ran_at", { ascending: false })
    .limit(5000);
  const items = summariseHealth((data ?? []) as SourceRunRow[], new Date());
  return (
    <main>
      <h1>Sources health</h1>
      <p className="muted">Problems first. A source is stale if it has not worked for 3 days.</p>
      <table>
        <thead><tr><th>Source</th><th>Status</th><th>Last success</th><th>Last error</th></tr></thead>
        <tbody>
          {items.map((h) => (
            <tr key={h.name}>
              <td>{h.name}</td>
              <td>{h.status}</td>
              <td>{h.lastOk ? h.lastOk.toISOString().slice(0, 16).replace("T", " ") : "never"}</td>
              <td>{h.lastError ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
