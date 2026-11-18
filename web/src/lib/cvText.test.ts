import { describe, expect, it } from "vitest";
import { CV_LIMITS, formatCvText, parseCvText, type CvMaster } from "./cvText";

const SAMPLE = `Name: Jane Doe
Email: jane@example.com
Phone: +34 600 000 000
Location: Barcelona, Spain
Links: https://linkedin.com/in/janedoe, https://example.com/jane

## Summary
Dual master's student in bioengineering and industrial business management.

## Education
### UPC | MSc Bioengineering | 2025 to 2027
- Thesis on cell culture automation
- Coursework in bioprocess design

## Experience
### Biotech Lab | Research Assistant | 2023 to 2024
- Ran 12 cell culture experiments
- Wrote the lab protocol for the team

## Skills
- Python
- Cell culture

## Languages
- English (C1)
- Catalan (native)
`;

function ok(text: string): CvMaster {
  const r = parseCvText(text);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.cv;
}

describe("parseCvText", () => {
  it("reads a full CV into sections with stable ids", () => {
    const cv = ok(SAMPLE);
    expect(cv.name).toBe("Jane Doe");
    expect(cv.email).toBe("jane@example.com");
    expect(cv.links).toEqual(["https://linkedin.com/in/janedoe", "https://example.com/jane"]);
    expect(cv.summary).toContain("bioengineering");
    expect(cv.education).toHaveLength(1);
    expect(cv.education[0]).toMatchObject({ id: "e1", org: "UPC", title: "MSc Bioengineering", dates: "2025 to 2027" });
    expect(cv.education[0].bullets.map((b) => b.id)).toEqual(["e1b1", "e1b2"]);
    expect(cv.experience[0].bullets[0]).toEqual({ id: "x1b1", text: "Ran 12 cell culture experiments" });
    expect(cv.skills.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(cv.languages[1]).toEqual({ id: "l2", text: "Catalan (native)" });
  });

  it("joins a summary written over several lines into one line of text", () => {
    expect(ok("Name: J\n\n## Summary\nFirst sentence.\nSecond sentence.\n").summary).toBe("First sentence. Second sentence.");
  });

  it("accepts a CV with only a name", () => {
    const cv = ok("Name: Jane\n");
    expect(cv.education).toEqual([]);
    expect(cv.links).toEqual([]);
  });

  it("is case insensitive for section names and accepts * bullets", () => {
    const cv = ok("Name: J\n\n## skills\n* Python\n");
    expect(cv.skills).toEqual([{ id: "s1", text: "Python" }]);
  });

  it.each([
    ["no name", "Email: a@b.co\n", /Name/],
    ["a bullet outside any entry", "Name: J\n\n## Experience\n- floating bullet\n", /Line 4.*entry/i],
    ["an entry with the wrong number of parts", "Name: J\n\n## Experience\n### Lab | Assistant\n", /Line 4.*Organisation \| Title \| Dates/],
    ["an unknown section", "Name: J\n\n## Hobbies\n- x\n", /Line 3.*Hobbies/],
    ["text before any section that is not a header line", "Name: J\nrandom words\n", /Line 2/],
    ["an entry with too many parts", "Name: J\n\n## Experience\n### Lab | Assistant | 2023 | extra\n", /Line 4.*Organisation \| Title \| Dates/],
    ["a link that is an ftp address", "Name: J\nLinks: ftp://example.com/cv\n", /Links/],
    ["a link that is a local file", "Name: J\nLinks: file:///etc/passwd\n", /Links/],
    ["an entry in the skills section", "Name: J\n\n## Skills\n### a | b | c\n", /Line 4/],
    ["a link that is not http or https", "Name: J\nLinks: javascript:alert(1)\n", /Links/],
    ["a bullet over the length limit", `Name: J\n\n## Skills\n- ${"x".repeat(CV_LIMITS.itemChars + 1)}\n`, /Line 4.*characters/],
    ["too much text overall", `Name: J\n\n## Summary\n${"word ".repeat(5000)}\n`, /too long/i],
  ])("refuses %s with a clear message", (_label, text, message) => {
    const r = parseCvText(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(message);
  });

  it("keeps markup and script text as plain text, never as structure", () => {
    const cv = ok("Name: <b>Jane</b>\n\n## Skills\n- <script>alert(1)</script>\n");
    expect(cv.name).toBe("<b>Jane</b>");
    expect(cv.skills[0].text).toBe("<script>alert(1)</script>");
  });

  it("reports every problem it finds, not just the first", () => {
    const r = parseCvText("Name: J\n\n## Experience\n- a\n- b\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(2);
  });
});

describe("formatCvText", () => {
  it("writes a CV back in the same layout", () => {
    expect(formatCvText(ok(SAMPLE)).trim()).toBe(SAMPLE.trim());
  });
});
