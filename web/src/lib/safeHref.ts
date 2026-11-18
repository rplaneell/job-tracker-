/** A plain web link, or an empty string. Links in job postings come from outside, so javascript: and data: links never pass. */
export function safeHref(url: string | null | undefined): string {
  const cleaned = (url ?? "").trim();
  return cleaned.length <= 2000 && /^https?:\/\/[^\s<>"'`]+$/i.test(cleaned) ? cleaned : "";
}
