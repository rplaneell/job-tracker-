export type RoleRow = {
  id: string;
  company: string;
  title: string;
  city: string | null;
  country: string | null;
  field_tag: string | null;
  level_tag: string | null;
  matched: boolean;
  status: "open" | "closed";
  first_seen: string;
  posted_at: string | null;
  url: string;
};

export type Filters = {
  country?: string;
  field?: string;
  matchedOnly: boolean;
  search: string;
};

/** Open roles only; matches to the owner's profile first, then the newest first. */
export function applyFilters(roles: RoleRow[], f: Filters): RoleRow[] {
  const q = f.search.trim().toLowerCase();
  return roles
    .filter((r) => r.status === "open")
    .filter((r) => !f.matchedOnly || r.matched)
    .filter((r) => !f.country || r.country === f.country)
    .filter((r) => !f.field || r.field_tag === f.field)
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q))
    .sort((a, b) => Number(b.matched) - Number(a.matched) || b.first_seen.localeCompare(a.first_seen));
}

export function countByCountry(roles: RoleRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of roles) {
    if (r.status !== "open" || !r.country) continue;
    counts[r.country] = (counts[r.country] ?? 0) + 1;
  }
  return counts;
}
