/** The LinkedIn desk: what the office knows about the owner's LinkedIn job alerts. Everything here is plain data, never instructions. */

export type LinkedInStatus = 'idle' | 'completed';

export const LINKEDIN_LABEL: Record<LinkedInStatus, string> = {
  idle: 'Waiting for the next alerts',
  completed: 'Alerts collected',
};

/** Alerts count as fresh for 36 hours after the last intake run, so one missed morning does not look like a failure. */
const FRESH_MS = 36 * 3_600_000;

const JOB_PATH = /^\/jobs\/view\/\d{1,20}\/?$/;

/** A plain LinkedIn job page link, or null. Links come from emails, so anything else (other hosts, http, script links) is refused. */
export function safeLinkedInHref(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  let parts: URL;
  try {
    parts = new URL(url);
  } catch {
    return null;
  }
  const host = parts.hostname.toLowerCase();
  if (parts.protocol !== 'https:' || !(host === 'linkedin.com' || host.endsWith('.linkedin.com'))) return null;
  return JOB_PATH.test(parts.pathname) ? url : null;
}

export function deskStatus(lastIntakeAt: string | null, now: Date): LinkedInStatus {
  const t = Date.parse(lastIntakeAt ?? '');
  return Number.isNaN(t) || now.getTime() - t > FRESH_MS ? 'idle' : 'completed';
}

export interface IntakeCounts {
  received: number;
  storedNew: number;
  queued: number;
}

const count = (x: unknown): number => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : 0);

/** Three counts from an audit log entry. Nothing else in the entry is read. */
export function describeIntake(detail: unknown): IntakeCounts {
  const d = typeof detail === 'object' && detail !== null ? (detail as Record<string, unknown>) : {};
  return { received: count(d.received), storedNew: count(d.stored_new), queued: count(d.queued_for_scouting) };
}
