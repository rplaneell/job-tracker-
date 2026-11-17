export type SourceRunRow = { source_name: string; ran_at: string; ok: boolean; error: string | null };
export type Health = { name: string; lastOk: Date | null; lastError: string | null; status: "ok" | "failing" | "stale" };

const STALE_MS = 3 * 24 * 60 * 60 * 1000;
const RANK = { failing: 0, stale: 1, ok: 2 } as const;

export function summariseHealth(runs: SourceRunRow[], now: Date, knownSources: string[] = []): Health[] {
  const names = new Set([...knownSources, ...runs.map((r) => r.source_name)]);
  const out: Health[] = [];
  for (const name of names) {
    const mine = runs.filter((r) => r.source_name === name).sort((a, b) => a.ran_at.localeCompare(b.ran_at));
    const latest = mine[mine.length - 1];
    const lastOkRun = [...mine].reverse().find((r) => r.ok);
    const lastOk = lastOkRun ? new Date(lastOkRun.ran_at) : null;
    let status: Health["status"];
    if (latest && !latest.ok) status = "failing";
    else if (!lastOk || now.getTime() - lastOk.getTime() > STALE_MS) status = "stale";
    else status = "ok";
    out.push({ name, lastOk, lastError: latest && !latest.ok ? latest.error : null, status });
  }
  return out.sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));
}
