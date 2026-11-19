export type RoleRow = {
  id: string;
  /** Which collector produced the role: a company board (greenhouse, lever...) or linkedin_alert. */
  source: string;
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
  /** Set when the owner ticked an alert as checked and removed it. Such a role is hidden everywhere in the list. */
  dismissed_at?: string | null;
};

export type Filters = {
  country?: string;
  city?: string;
  /** linkedin: only alerts from the owner's LinkedIn emails. boards: only company job boards. Empty: both. */
  source?: "" | "linkedin" | "boards";
  field?: string;
  matchedOnly: boolean;
  search: string;
};

/** Senior roles are never wanted, so they are hidden even when an older collection stored them. Whole word in the title only. */
export const isUnwantedTitle = (title: string): boolean => /(?<![\p{L}\p{N}])(senior|sr)(?![\p{L}\p{N}])/iu.test(title);

export const isLinkedInAlert = (r: Pick<RoleRow, "source">): boolean => r.source === "linkedin_alert";

/** Only alerts from the owner's LinkedIn emails can be removed once checked. Company board roles stay until the company closes them. */
export const canDismiss = (r: Pick<RoleRow, "source">): boolean => isLinkedInAlert(r);

const isVisible = (r: RoleRow): boolean => r.status === "open" && !r.dismissed_at;

/** Open roles only; matches to the owner's profile first, then the newest first. */
export function applyFilters(roles: RoleRow[], f: Filters): RoleRow[] {
  const q = f.search.trim().toLowerCase();
  return roles
    .filter(isVisible)
    .filter((r) => !isUnwantedTitle(r.title))
    .filter((r) => !f.matchedOnly || r.matched)
    .filter((r) => !f.country || r.country === f.country)
    .filter((r) => !f.city || r.city === f.city)
    .filter((r) => !f.source || (f.source === "linkedin") === isLinkedInAlert(r))
    .filter((r) => !f.field || r.field_tag === f.field)
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.company.toLowerCase().includes(q))
    .sort((a, b) => Number(b.matched) - Number(a.matched) || b.first_seen.localeCompare(a.first_seen));
}

export function countByCountry(roles: RoleRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of roles) {
    if (!isVisible(r) || !r.country) continue;
    counts[r.country] = (counts[r.country] ?? 0) + 1;
  }
  return counts;
}

/** The cities that open roles are in, most roles first, then by name. A chosen country limits the list to its own cities. */
export function cityOptions(roles: RoleRow[], country?: string): { city: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of roles) {
    const city = r.city?.trim();
    if (!isVisible(r) || !city || (country && r.country !== country)) continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return [...counts].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}
