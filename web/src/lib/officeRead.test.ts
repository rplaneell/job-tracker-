import { describe, expect, it } from "vitest";
import { readOffice, type OfficeClient } from "./officeRead";

type Call = { table: string; columns: string; filters: string[]; order?: string; limit?: number };

function fakeClient(replies: Record<string, { data: unknown; error: { message: string } | null }>, calls: Call[] = []): OfficeClient {
  return {
    from(table: string) {
      const call: Call = { table, columns: "", filters: [] };
      calls.push(call);
      const q: any = {
        select(columns: string) { call.columns = columns; return q; },
        eq(col: string, v: unknown) { call.filters.push(`eq ${col} ${String(v)}`); return q; },
        gte(col: string, v: unknown) { call.filters.push(`gte ${col}`); return q; },
        order(col: string) { call.order = col; return q; },
        limit(n: number) { call.limit = n; return q; },
        then(res: (v: unknown) => unknown) { return Promise.resolve(replies[table] ?? { data: [], error: null }).then(res); },
      };
      return q;
    },
  };
}

const NOW = new Date("2026-11-19T10:00:00Z");

describe("readOffice", () => {
  it("returns every part the office needs, with the time", async () => {
    const out = await readOffice(fakeClient({ agent_tasks: { data: [{ id: "t" }], error: null }, applications: { data: [{ stage: "applied" }], error: null } }), NOW);
    expect(out.now).toBe(NOW.toISOString());
    expect(out.tasks).toEqual([{ id: "t" }]);
    expect(out.applications).toEqual([{ stage: "applied" }]);
    expect(out.verdicts).toEqual([]);
    expect(out.versions).toEqual([]);
    expect(out.newRoles).toEqual([]);
  });
  it("only asks for roles that fit the profile, are open and were first seen in the last three days", async () => {
    const calls: Call[] = [];
    await readOffice(fakeClient({}, calls), NOW);
    const roles = calls.find((c) => c.table === "roles")!;
    expect(roles.filters).toEqual(expect.arrayContaining(["eq matched true", "eq status open", "gte first_seen"]));
  });
  it("caps every read, so one big table never makes a huge reply", async () => {
    const calls: Call[] = [];
    await readOffice(fakeClient({}, calls), NOW);
    expect(calls.length).toBe(5);
    for (const c of calls) expect(c.limit).toBeGreaterThan(0);
    for (const c of calls) expect(c.limit).toBeLessThanOrEqual(500);
  });
  it("fails with a plain message when any read fails", async () => {
    await expect(readOffice(fakeClient({ scout_verdicts: { data: null, error: { message: "boom" } } }), NOW)).rejects.toThrow(/could not read scout_verdicts/);
  });
});
