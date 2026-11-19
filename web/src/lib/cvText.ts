/**
 * The master CV is typed as plain text in the dashboard and stored as structured data. This file turns one into the other.
 * Everything stays plain text: nothing here ever treats CV text as markup.
 */

export interface CvItem {
  id: string;
  text: string;
}

export interface CvEntry {
  id: string;
  org: string;
  title: string;
  dates: string;
  bullets: CvItem[];
}

export interface CvMaster {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  summary: string;
  education: CvEntry[];
  experience: CvEntry[];
  skills: CvItem[];
  languages: CvItem[];
}

export const CV_LIMITS = { totalChars: 20000, itemChars: 400, summaryChars: 1200, entries: 20, bulletsPerEntry: 12, items: 60 } as const;

export type ParseResult = { ok: true; cv: CvMaster } | { ok: false; errors: string[] };

type Section = "summary" | "education" | "experience" | "skills" | "languages";
const SECTIONS: readonly Section[] = ["summary", "education", "experience", "skills", "languages"];
const HEADERS = ["name", "email", "phone", "location", "links"] as const;

const empty = (): CvMaster => ({ name: "", email: "", phone: "", location: "", links: [], summary: "", education: [], experience: [], skills: [], languages: [] });

export function parseCvText(text: string): ParseResult {
  const errors: string[] = [];
  const cv = empty();
  if (text.length > CV_LIMITS.totalChars) errors.push(`The CV is too long (limit ${CV_LIMITS.totalChars} characters).`);
  const fail = (line: number, message: string) => errors.push(`Line ${line}: ${message}`);

  let section: Section | null = null;
  let entry: CvEntry | null = null;
  const summaryParts: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const n = index + 1;
    const line = raw.trim();
    if (!line) return;
    if (line.length > CV_LIMITS.itemChars && !(section === "summary" && line.length <= CV_LIMITS.summaryChars)) {
      fail(n, `this line is over ${CV_LIMITS.itemChars} characters. Split it into shorter lines.`);
      return;
    }

    if (line.startsWith("##") && !line.startsWith("###")) {
      const name = line.replace(/^##\s*/, "").toLowerCase();
      const found = SECTIONS.find((s) => s === name);
      if (!found) {
        fail(n, `unknown section "${line.replace(/^##\s*/, "")}". Use Summary, Education, Experience, Skills or Languages.`);
        section = null;
      } else section = found;
      entry = null;
      return;
    }

    if (section === null) {
      const colon = line.indexOf(":");
      const key = colon > 0 ? line.slice(0, colon).trim().toLowerCase() : "";
      if (!(HEADERS as readonly string[]).includes(key)) {
        fail(n, "expected a header like Name: Jane Doe, or a section starting with ##.");
        return;
      }
      const value = line.slice(colon + 1).trim();
      if (key === "links") {
        const links = value.split(",").map((s) => s.trim()).filter(Boolean);
        if (links.some((l) => !/^https?:\/\/\S+$/i.test(l))) fail(n, "Links must be web addresses starting with http:// or https://, separated by commas.");
        else cv.links = links;
      } else (cv as unknown as Record<string, string>)[key] = value;
      return;
    }

    if (line.startsWith("###")) {
      if (section !== "education" && section !== "experience") {
        fail(n, "entries (###) only belong in Education and Experience.");
        return;
      }
      const parts = line.replace(/^###\s*/, "").split("|").map((s) => s.trim());
      if (parts.length !== 3 || parts.some((p) => !p)) {
        fail(n, "write entries as Organisation | Title | Dates, for example ### UPC | MSc Bioengineering | 2025 to 2027.");
        entry = null;
        return;
      }
      const list = cv[section];
      if (list.length >= CV_LIMITS.entries) {
        fail(n, `at most ${CV_LIMITS.entries} entries per section.`);
        entry = null;
        return;
      }
      entry = { id: `${section === "education" ? "e" : "x"}${list.length + 1}`, org: parts[0], title: parts[1], dates: parts[2], bullets: [] };
      list.push(entry);
      return;
    }

    if (section === "summary") {
      summaryParts.push(line);
      return;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (!bullet) {
      fail(n, "expected a bullet starting with - or an entry starting with ###.");
      return;
    }
    const itemText = bullet[1].trim();
    if (section === "education" || section === "experience") {
      if (!entry) {
        fail(n, "a bullet must come under an entry (### Organisation | Title | Dates).");
        return;
      }
      if (entry.bullets.length >= CV_LIMITS.bulletsPerEntry) {
        fail(n, `at most ${CV_LIMITS.bulletsPerEntry} bullets per entry.`);
        return;
      }
      entry.bullets.push({ id: `${entry.id}b${entry.bullets.length + 1}`, text: itemText });
    } else {
      const list = cv[section];
      if (list.length >= CV_LIMITS.items) {
        fail(n, `at most ${CV_LIMITS.items} items in this section.`);
        return;
      }
      list.push({ id: `${section === "skills" ? "s" : "l"}${list.length + 1}`, text: itemText });
    }
  });

  cv.summary = summaryParts.join(" ");
  if (cv.summary.length > CV_LIMITS.summaryChars) errors.push(`The summary is too long (limit ${CV_LIMITS.summaryChars} characters).`);
  if (!cv.name) errors.push("Name is required. Start the CV with a line like Name: Jane Doe.");
  return errors.length ? { ok: false, errors } : { ok: true, cv };
}

export function formatCvText(cv: CvMaster): string {
  const out: string[] = [];
  out.push(`Name: ${cv.name}`);
  if (cv.email) out.push(`Email: ${cv.email}`);
  if (cv.phone) out.push(`Phone: ${cv.phone}`);
  if (cv.location) out.push(`Location: ${cv.location}`);
  if (cv.links.length) out.push(`Links: ${cv.links.join(", ")}`);
  const block = (title: string, body: string[]) => {
    if (body.length) out.push("", `## ${title}`, ...body);
  };
  block("Summary", cv.summary ? [cv.summary] : []);
  const entries = (list: CvEntry[]) =>
    list.flatMap((e, i) => [...(i ? [""] : []), `### ${e.org} | ${e.title} | ${e.dates}`, ...e.bullets.map((b) => `- ${b.text}`)]);
  block("Education", entries(cv.education));
  block("Experience", entries(cv.experience));
  block("Skills", cv.skills.map((s) => `- ${s.text}`));
  block("Languages", cv.languages.map((s) => `- ${s.text}`));
  return out.join("\n") + "\n";
}
