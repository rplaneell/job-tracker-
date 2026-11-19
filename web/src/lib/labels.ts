export const FIELD: Record<string, string> = {
  consulting: "Consulting",
  finance: "Finance",
  vc: "Venture capital",
  business_analyst: "Business analyst",
  business_development: "Business development",
  health_science: "Health science",
};

export const LEVEL: Record<string, string> = { internship: "Internship", entry_level: "Entry level" };

/** The six places the owner targets, with their two letter country codes (ISO 3166). */
export const COUNTRY_CODE: Record<string, string> = {
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Spain: "ES",
  Denmark: "DK",
  "United States": "US",
};

export function ago(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "no date";
  const days = Math.floor((now.getTime() - new Date(iso).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return "no date";
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

export function where(city: string | null, country: string | null): string {
  if (city && country) return `${city}, ${COUNTRY_CODE[country] ?? country}`;
  return city ?? country ?? "Location not stated";
}
