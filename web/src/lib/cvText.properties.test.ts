import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { formatCvText, parseCvText, type CvMaster } from "./cvText";

// Single line text without the characters that carry structure, and no stray leading or trailing spaces.
const word = fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.replace(/[\r\n|#*]/g, "x").replace(/^-+/, "x").trim() || "x");
const item = (prefix: string) => fc.array(word, { maxLength: 4 }).map((texts) => texts.map((text, i) => ({ id: `${prefix}${i + 1}`, text })));
const entry = () => fc.record({ org: word, title: word, dates: word, bullets: fc.array(word, { maxLength: 3 }) });

const cvArb: fc.Arbitrary<CvMaster> = fc
  .record({
    name: word,
    email: fc.constant(""),
    phone: fc.constant(""),
    location: word,
    summary: fc.constant(""),
    education: fc.array(entry(), { maxLength: 3 }),
    experience: fc.array(entry(), { maxLength: 3 }),
    skills: item("s"),
    languages: item("l"),
  })
  .map((r) => ({
    ...r,
    links: [],
    education: r.education.map((e, i) => ({ id: `e${i + 1}`, org: e.org, title: e.title, dates: e.dates, bullets: e.bullets.map((text, j) => ({ id: `e${i + 1}b${j + 1}`, text })) })),
    experience: r.experience.map((e, i) => ({ id: `x${i + 1}`, org: e.org, title: e.title, dates: e.dates, bullets: e.bullets.map((text, j) => ({ id: `x${i + 1}b${j + 1}`, text })) })),
  }));

describe("cv text properties", () => {
  it("parse(format(cv)) gives back the same CV", () =>
    fc.assert(
      fc.property(cvArb, (cv) => {
        const r = parseCvText(formatCvText(cv));
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.cv).toEqual(cv);
      }),
    ));

  it("never throws on any input, whatever it contains", () =>
    fc.assert(fc.property(fc.string({ maxLength: 400 }), (text) => { parseCvText(text); })));
});
