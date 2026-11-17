import { describe, expect, it } from "vitest";
import { applyFilters, type RoleRow } from "./filters";

const row = (over: Partial<RoleRow>): RoleRow => ({
  id: "1", company: "Acme", title: "Business Analyst", city: "Zurich", country: "Switzerland",
  field_tag: "consulting", level_tag: "internship", matched: true, status: "open",
  first_seen: "2026-11-10T00:00:00Z", url: "https://x", ...over,
});
const none = { matchedOnly: false, search: "" };

describe("applyFilters", () => {
  it("filters by city", () => {
    const rows = [row({ id: "1" }), row({ id: "2", city: "Basel" })];
    expect(applyFilters(rows, { ...none, city: "Basel" }).map((r) => r.id)).toEqual(["2"]);
  });
  it("matchedOnly hides unmatched roles", () => {
    const rows = [row({ id: "1" }), row({ id: "2", matched: false })];
    expect(applyFilters(rows, { ...none, matchedOnly: true }).map((r) => r.id)).toEqual(["1"]);
  });
  it("search matches title and company case insensitively", () => {
    const rows = [row({ id: "1", title: "Strategy Associate" }), row({ id: "2", company: "Novartis", title: "X" })];
    expect(applyFilters(rows, { ...none, search: "NOVARTIS" }).map((r) => r.id)).toEqual(["2"]);
    expect(applyFilters(rows, { ...none, search: "strategy" }).map((r) => r.id)).toEqual(["1"]);
  });
  it("empty filters return all roles sorted newest first_seen first", () => {
    const rows = [row({ id: "old", first_seen: "2026-11-01T00:00:00Z" }), row({ id: "new", first_seen: "2026-11-15T00:00:00Z" })];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["new", "old"]);
  });
  it("hides closed roles", () => {
    const rows = [row({ id: "1" }), row({ id: "2", status: "closed" })];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["1"]);
  });
  it("copes with null city and null field", () => {
    const rows = [row({ id: "1", city: null, field_tag: null })];
    expect(applyFilters(rows, { ...none, city: "Zurich" })).toEqual([]);
    expect(applyFilters(rows, none)).toHaveLength(1);
  });
});
