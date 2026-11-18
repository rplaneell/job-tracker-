import { serverClient } from "@/lib/supabase/server";
import { summariseHealth, type SourceRunRow } from "@/lib/health";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { ok: "Working", failing: "Failing", stale: "Stale" } as const;

export default async function Sources() {
  const supabase = await serverClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("source_runs")
    .select("source_name,ran_at,ok,error,role_count")
    .gte("ran_at", since)
    .order("ran_at", { ascending: false })
    .limit(5000);
  const runs = (data ?? []) as (SourceRunRow & { role_count: number })[];
  const items = summariseHealth(runs, new Date());
  const latestCount = new Map<string, number>();
  for (const r of runs) if (!latestCount.has(r.source_name)) latestCount.set(r.source_name, r.role_count);
  const working = items.filter((h) => h.status === "ok").length;
  const total = [...latestCount.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="head">
        <div>
          <h1>Sources</h1>
          <p>Where the roles come from, and whether each source is working. Problems are listed first.</p>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><div className="n">{working}<small>of {items.length}</small></div><div className="l">Sources working</div></div>
        <div className="stat"><div className="n">{total}</div><div className="l">Roles read last run</div></div>
        <div className="stat"><div className="n">{items.length - working}</div><div className="l">Needing attention</div></div>
        <div className="stat"><div className="n">1<small>per day</small></div><div className="l">Collection schedule</div></div>
      </div>
      <section className="panel scroll">
        {items.length ? (
          <table>
            <thead>
              <tr><th>Company</th><th>Status</th><th>Roles</th><th>Last success</th><th>Last error</th></tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.name}>
                  <td><strong>{h.name}</strong></td>
                  <td><span className={`pill ${h.status}`}>{STATUS_LABEL[h.status]}</span></td>
                  <td className="mono">{latestCount.get(h.name) ?? 0}</td>
                  <td className="mono">{h.lastOk ? h.lastOk.toISOString().slice(0, 16).replace("T", " ") : "never"}</td>
                  <td>{h.lastError ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <strong>No collection has run yet</strong>
            <span>Start the &quot;Daily job collection&quot; workflow from the Actions tab on GitHub. Results appear here.</span>
          </div>
        )}
      </section>
      <div className="cols2">
        <section className="panel note">
          <h2>How sources are chosen</h2>
          <p>Every source passes the same checks before it is read.</p>
          <ul>
            <li>It must allow automated reading in its robots.txt file.</li>
            <li>Its terms of use are read once and recorded.</li>
            <li>One request a second at most, once a day.</li>
          </ul>
        </section>
        <section className="panel note">
          <h2>LinkedIn</h2>
          <p>LinkedIn forbids automated reading, so the tool does not scrape it. Your own LinkedIn job alert emails can be added here instead.</p>
          <span className="lock">Planned</span>
        </section>
      </div>
    </>
  );
}
