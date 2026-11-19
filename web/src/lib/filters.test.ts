import { describe, expect, it } from "vitest";
import { applyFilters, canDismiss, cityOptions, countByCountry, isLinkedInAlert, isUnwantedTitle, type RoleRow } from "./filters";

const row = (over: Partial<RoleRow>): RoleRow => ({
  source: "greenhouse", id: "1", company: "Acme", title: "Business Analyst", city: "Zurich", country: "Switzerland",
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

describe("source filter", () => {
  const rows = [
    row({ id: "1", source: "greenhouse" }),
    row({ id: "2", source: "linkedin_alert" }),
    row({ id: "3", source: "lever" }),
  ];
  it("knows which roles came from a LinkedIn alert", () => {
    expect(isLinkedInAlert(rows[1])).toBe(true);
    expect(isLinkedInAlert(rows[0])).toBe(false);
  });
  it("shows only LinkedIn alerts, or only company boards, or everything", () => {
    expect(applyFilters(rows, { ...none, source: "linkedin" }).map((r) => r.id)).toEqual(["2"]);
    expect(applyFilters(rows, { ...none, source: "boards" }).map((r) => r.id).sort()).toEqual(["1", "3"]);
    expect(applyFilters(rows, { ...none, source: "" })).toHaveLength(3);
    expect(applyFilters(rows, none)).toHaveLength(3);
  });
  it("keeps alert roles in the same list as the others, sorted by the same rules", () => {
    const mixed = [row({ id: "board", first_seen: "2026-11-10T00:00:00Z" }), row({ id: "alert", source: "linkedin_alert", first_seen: "2026-11-12T00:00:00Z" })];
    expect(applyFilters(mixed, none).map((r) => r.id)).toEqual(["alert", "board"]);
  });
});

describe("senior roles are never shown", () => {
  it("recognises senior in the title as a whole word, in any case, and sr as well", () => {
    for (const t of ["Senior Analyst", "Analyst, Senior", "SENIOR consultant", "Sr. Consultant", "Sr Analyst"]) expect(isUnwantedTitle(t), t).toBe(true);
    for (const t of ["Seniority Analyst", "Junior Analyst", "Associate Consultant", "Srinagar Analyst", ""]) expect(isUnwantedTitle(t), t).toBe(false);
  });
  it("hides senior roles from the list even if they were stored earlier, whatever else is chosen", () => {
    const rows = [row({ id: "1", title: "Senior Consultant" }), row({ id: "2", title: "Associate Consultant" }), row({ id: "3", title: "Sr. Analyst", matched: false })];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["2"]);
    expect(applyFilters(rows, { ...none, matchedOnly: true }).map((r) => r.id)).toEqual(["2"]);
  });
});

describe("removing a checked alert", () => {
  it("hides a role the owner has dismissed, and keeps the others", () => {
    const rows = [row({ id: "1", source: "linkedin_alert" }), row({ id: "2", source: "linkedin_alert", dismissed_at: "2026-11-19T12:00:00Z" })];
    expect(applyFilters(rows, none).map((r) => r.id)).toEqual(["1"]);
  });
  it("treats a missing or null dismissal as not dismissed", () => {
    const rows = [row({ id: "1" }), row({ id: "2", dismissed_at: null })];
    expect(applyFilters(rows, none).map((r) => r.id).sort()).toEqual(["1", "2"]);
  });
  it("does not count a dismissed role in the country or city lists", () => {
    const rows = [row({ id: "1" }), row({ id: "2", dismissed_at: "2026-11-19T12:00:00Z" })];
    expect(countByCountry(rows)).toEqual({ Switzerland: 1 });
    expect(cityOptions(rows)).toEqual([{ city: "Zurich", count: 1 }]);
  });
  it("only LinkedIn alerts can be removed this way", () => {
    expect(canDismiss(row({ source: "linkedin_alert" }))).toBe(true);
    expect(canDismiss(row({ source: "greenhouse" }))).toBe(false);
  });
});
