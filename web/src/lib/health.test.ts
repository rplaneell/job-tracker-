import { describe, expect, it } from "vitest";
import { summariseHealth, type SourceRunRow } from "./health";

const now = new Date("2026-11-17T12:00:00Z");
const run = (name: string, ran_at: string, ok: boolean, error: string | null = null): SourceRunRow => ({ source_name: name, ran_at, ok, error });

describe("summariseHealth", () => {
  it("ok when the latest run succeeded", () => {
    const [h] = summariseHealth([run("Acme", "2026-11-17T06:00:00Z", true)], now);
    expect(h).toMatchObject({ name: "Acme", status: "ok", lastError: null });
  });
  it("failing when the latest run failed, showing its error", () => {
    const [h] = summariseHealth([run("Acme", "2026-11-16T06:00:00Z", true), run("Acme", "2026-11-17T06:00:00Z", false, "board not found")], now);
    expect(h).toMatchObject({ status: "failing", lastError: "board not found" });
    expect(h.lastOk).toEqual(new Date("2026-11-16T06:00:00Z"));
  });
  it("stale when the last success is older than 3 days", () => {
    const [h] = summariseHealth([run("Acme", "2026-11-10T06:00:00Z", true)], now);
    expect(h.status).toBe("stale");
  });
  it("source with no runs is stale with null dates", () => {
    const [h] = summariseHealth([], now, ["Newco"]);
    expect(h).toEqual({ name: "Newco", lastOk: null, lastError: null, status: "stale" });
  });
  it("sorts failing and stale sources before ok ones", () => {
    const hs = summariseHealth([run("A", "2026-11-17T06:00:00Z", true), run("B", "2026-11-17T06:00:00Z", false, "x")], now);
    expect(hs.map((h) => h.name)).toEqual(["B", "A"]);
  });
});
