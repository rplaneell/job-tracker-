import { describe, expect, it } from "vitest";
import { applyFilters, cityOptions, countByCountry, type RoleRow } from "./filters";

const row = (over: Partial<RoleRow>): RoleRow => ({
  id: "1", company: "Acme", title: "Business Analyst", city: "Zurich", country: "Switzerland",
  field_tag: "consulting", level_tag: "internship", matched: true, status: "open",
  first_seen: "2026-11-10T00:00:00Z", posted_at: null, url: "https://x", ...over,
});
const none = { matchedOnly: false, search: "" };

describe("applyFilters", () => {
  it("filters by country", () => {
    const rows = [row({ id: "1" }), row({ id: "2", country: "Denmark", city: "Copenhagen" })];
    expect(applyFilters(rows, { ...none, country: "Denmark" }).map((r) => r.id)).toEqual(["2"]);
  });
  it("filters by field", () => {
    const rows = [row({ id: "1" }), row({ id: "2", field_tag: "finance" })];
    expect(applyFilters(rows, { ...none, field: "finance" }).map((r) => r.id)).toEqual(["2"]);
  });
  it("matchedOnly hides roles that do not match the profile", () => {
    const rows = [row({ id: "1" }), row({ id: "2", matched: false })];
    expect(applyFilters(rows, { ...none, matchedOnly: true }).map((r) => r.id)).toEqual(["1"]);
  });
  it("search matches title and company case insensitively", () => {
    const rows = [row({ id: "1", title: "Strategy Associate" }), row({ id: "2", company: "Novartis", title: "X" })];
    expect(applyFilters(rows, { ...none, search: "NOVARTIS" }).map((r) => r.id)).toEqual(["2"]);
    expect(applyFilters(rows, { ...none, search: "strategy" }).map((r) => r.id)).toEqual(["1"]);
  });
  it("puts matches first, then the newest first_seen", () => {
    const rows = [
      row({ id: "old-match", first_seen: "2026-11-01T00:00:00Z" }),
      row({ id: "new-other", matched: false, first_seen: "2026-11-15T00:00:00Z" }),
      row({ id: "new-match", first_seen: "2026-11-14T00:00:00Z" }),
    ];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["new-match", "old-match", "new-other"]);
  });
  it("hides closed roles", () => {
    const rows = [row({ id: "1" }), row({ id: "2", status: "closed" })];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["1"]);
  });
  it("copes with null country and null field", () => {
    const rows = [row({ id: "1", country: null, field_tag: null })];
    expect(applyFilters(rows, { ...none, country: "Spain" })).toEqual([]);
    expect(applyFilters(rows, none)).toHaveLength(1);
  });
});

describe("countByCountry", () => {
  it("counts open roles per country and skips missing countries", () => {
    const rows = [row({ id: "1" }), row({ id: "2" }), row({ id: "3", country: "Spain" }), row({ id: "4", country: null }), row({ id: "5", status: "closed" })];
    expect(countByCountry(rows)).toEqual({ Switzerland: 2, Spain: 1 });
  });
});

describe("city filter", () => {
  const rows = [
    row({ id: "1", city: "Zurich" }),
    row({ id: "2", city: "Geneva" }),
    row({ id: "3", city: "Barcelona", country: "Spain" }),
    row({ id: "4", city: null }),
  ];
  it("filters by city", () => {
    expect(applyFilters(rows, { ...none, city: "Geneva" }).map((r) => r.id)).toEqual(["2"]);
  });
  it("combines with the country filter", () => {
    expect(applyFilters(rows, { ...none, country: "Spain", city: "Zurich" })).toEqual([]);
    expect(applyFilters(rows, { ...none, country: "Spain", city: "Barcelona" }).map((r) => r.id)).toEqual(["3"]);
  });
  it("hides roles with no city when a city is chosen, and shows them when none is", () => {
    expect(applyFilters(rows, { ...none, city: "Zurich" }).map((r) => r.id)).toEqual(["1"]);
    expect(applyFilters(rows, none)).toHaveLength(4);
  });
});

describe("cityOptions", () => {
  const rows = [
    row({ id: "1", city: "Zurich" }), row({ id: "2", city: "Zurich" }), row({ id: "3", city: "Geneva" }),
    row({ id: "4", city: "Barcelona", country: "Spain" }), row({ id: "5", city: null }), row({ id: "6", city: "  " }),
    row({ id: "7", city: "Bern", status: "closed" }),
  ];
  it("lists cities of open roles with counts, most roles first, then by name", () => {
    expect(cityOptions(rows)).toEqual([
      { city: "Zurich", count: 2 }, { city: "Barcelona", count: 1 }, { city: "Geneva", count: 1 },
    ]);
  });
  it("only lists cities of the chosen country", () => {
    expect(cityOptions(rows, "Switzerland")).toEqual([{ city: "Zurich", count: 2 }, { city: "Geneva", count: 1 }]);
    expect(cityOptions(rows, "Denmark")).toEqual([]);
  });
});
