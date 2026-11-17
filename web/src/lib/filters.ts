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
  url: string;
};

export type Filters = {
  city?: string;
  field?: string;
  company?: string;
  level?: string;
  matchedOnly: boolean;
  search: string;
};

export function applyFilters(roles: RoleRow[], f: Filters): RoleRow[] {
  const q = f.search.trim().toLowerCase();
  return roles
    .filter((r) => r.status === "open")
    .filter((r) => !f.matchedOnly || r.matched)
    .filter((r) => !f.city || r.city === f.city)
    .filter((r) => !f.field || r.field_tag === f.field)
    .filter((r) => !f.company || r.company === f.company)
    .filter((r) => !f.level || r.level_tag === f.level)
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q))
    .sort((a, b) => b.first_seen.localeCompare(a.first_seen));
}
