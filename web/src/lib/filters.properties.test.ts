import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { applyFilters, countByCountry, type RoleRow } from "./filters";
import { safeHref } from "./safeHref";

const country = fc.constantFrom("Netherlands", "Belgium", "Switzerland", "Spain", "Denmark", null);
const role = fc.record({
  source: fc.constantFrom("greenhouse", "lever", "linkedin_alert"), id: fc.uuid(), company: fc.string({ maxLength: 20 }), title: fc.string({ maxLength: 40 }),
  city: fc.option(fc.string({ maxLength: 12 }), { nil: null }), country,
  field_tag: fc.option(fc.constantFrom("consulting", "finance", "vc"), { nil: null }), level_tag: fc.constant(null),
  matched: fc.boolean(), status: fc.constantFrom("open" as const, "closed" as const),
  first_seen: fc.date({ min: new Date("2026-01-01"), max: new Date("2027-01-01"), noInvalidDate: true }).map((d) => d.toISOString()),
  posted_at: fc.constant(null), url: fc.string({ maxLength: 40 }),
}) as fc.Arbitrary<RoleRow>;
const roles = fc.array(role, { maxLength: 40 });
const filters = fc.record({ matchedOnly: fc.boolean(), search: fc.string({ maxLength: 6 }), country: fc.option(country.filter((c) => c !== null) as fc.Arbitrary<string>, { nil: undefined }) });

describe("applyFilters properties", () => {
  it("only returns open roles that were in the input", () => {
    fc.assert(fc.property(roles, filters, (rs, f) => {
      const out = applyFilters(rs, f);
      const ids = new Set(rs.map((r) => r.id));
      expect(out.every((r) => r.status === "open" && ids.has(r.id))).toBe(true);
    }));
  });
  it("is stable when applied twice and never changes its input", () => {
    fc.assert(fc.property(roles, filters, (rs, f) => {
      const copy = JSON.stringify(rs);
      const once = applyFilters(rs, f);
      expect(applyFilters(once, f)).toEqual(once);
      expect(JSON.stringify(rs)).toBe(copy);
    }));
  });
  it("keeps matches before non matches, then newest first", () => {
    fc.assert(fc.property(roles, (rs) => {
      const out = applyFilters(rs, { matchedOnly: false, search: "" });
      for (let i = 1; i < out.length; i++) {
        const a = out[i - 1], b = out[i];
        expect(Number(a.matched) >= Number(b.matched)).toBe(true);
        if (a.matched === b.matched) expect(a.first_seen >= b.first_seen).toBe(true);
      }
    }));
  });
  it("a country filter returns only that country, and the counts never exceed the open roles", () => {
    fc.assert(fc.property(roles, (rs) => {
      const counts = countByCountry(rs);
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(rs.filter((r) => r.status === "open").length);
      for (const c of Object.keys(counts)) {
        expect(applyFilters(rs, { matchedOnly: false, search: "", country: c }).every((r) => r.country === c)).toBe(true);
      }
    }));
  });
});

describe("safeHref properties", () => {
  it("is empty or a plain web link, whatever text it is given", () => {
    fc.assert(fc.property(fc.string({ maxLength: 300 }), (s) => {
      const out = safeHref(s);
      expect(out === "" || /^https?:\/\/[^\s<>"'`]+$/i.test(out)).toBe(true);
      expect(out.toLowerCase()).not.toContain("javascript:");
    }));
  });
});
