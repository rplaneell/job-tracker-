import type { CvDraft } from '../ui/CvPanel';
import type { AgentTask } from '../domain/scouting';
import { STAGES, type Priority, type Stage } from '../domain/reception';
import { describeIntake, safeLinkedInHref, type IntakeCounts } from '../domain/linkedin';
import { toItems, toTasks, type ScoutItem } from './scoutData';

/** Everything the office shows, read from the owner's own database through the dashboard's /api/office. */
/** One role that came from a LinkedIn alert email, with its Scouting verdict if there is one. */
export interface LinkedInAlert {
  id: string;
  title: string;
  company: string;
  city: string | null;
  /** The plain LinkedIn job page, or null when the stored link is not one. */
  href: string | null;
  fits: boolean;
  score: number | null;
  shortlisted: boolean;
  firstSeen: string;
}

export interface OfficeData {
  now: Date;
  scoutTasks: AgentTask[];
  scoutItems: ScoutItem[];
  cvTasks: AgentTask[];
  cvDrafts: CvDraft[];
  applications: { stage: Stage }[];
  priorities: Priority[];
  alerts: LinkedInAlert[];
  lastIntake: (IntakeCounts & { at: string }) | null;
}

const DAY = 86_400_000;
const FOLLOW_UP_AFTER_DAYS = 7;

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const text = (x: unknown): string | null => (typeof x === 'string' && x.length > 0 ? x : null);
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const rolesOf = (row: Record<string, unknown>): Record<string, unknown> => (isRecord(row.roles) ? row.roles : {});

function toDrafts(rows: unknown[]): CvDraft[] {
  const drafts: CvDraft[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = text(row.id);
    if (!id || (row.status !== 'draft' && row.status !== 'approved')) continue;
    const role = rolesOf(row);
    drafts.push({ id, status: row.status, title: text(role.title) ?? 'Unknown role', company: text(role.company) ?? '' });
  }
  return drafts;
}

function toAlerts(rows: unknown[]): LinkedInAlert[] {
  const alerts: LinkedInAlert[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = text(row.id);
    const title = text(row.title);
    if (!id || !title) continue;
    const verdict = list(row.scout_verdicts).find(isRecord);
    const score = verdict && typeof verdict.score === 'number' && Number.isInteger(verdict.score) && verdict.score >= 0 && verdict.score <= 100 ? verdict.score : null;
    alerts.push({
      id,
      title,
      company: text(row.company) ?? '',
      city: text(row.city),
      href: safeLinkedInHref(row.url),
      fits: row.matched === true,
      score,
      shortlisted: verdict?.shortlisted === true,
      firstSeen: text(row.first_seen) ?? '',
    });
  }
  return alerts;
}

function toLastIntake(rows: unknown[]): OfficeData['lastIntake'] {
  const row = rows.find(isRecord);
  const at = row ? text(row.at) : null;
  return row && at && !Number.isNaN(Date.parse(at)) ? { at, ...describeIntake(row.detail) } : null;
}

function sentence(cities: string[]): string {
  if (cities.length === 0) return 'Open Roles to see them';
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(', ')} and ${cities[cities.length - 1]}`;
}

function buildPriorities(applications: unknown[], newRoles: unknown[], now: Date): Priority[] {
  const priorities: Priority[] = [];
  applications.forEach((row, i) => {
    if (!isRecord(row) || row.stage !== 'applied') return;
    const applied = Date.parse(text(row.applied_at) ?? '');
    if (Number.isNaN(applied)) return;
    const days = (now.getTime() - applied) / DAY;
    if (days < FOLLOW_UP_AFTER_DAYS) return;
    const company = text(rolesOf(row).company) ?? 'this company';
    priorities.push({
      id: `follow-${i}`,
      kind: 'followUp',
      title: `Follow up with ${company}`,
      detail: `Applied ${Math.floor(days)} days ago, no reply yet`,
      due: new Date(applied + FOLLOW_UP_AFTER_DAYS * DAY).toISOString(),
    });
  });
  if (newRoles.length > 0) {
    const cities: string[] = [];
    for (const row of newRoles) {
      const city = isRecord(row) ? text(row.city) : null;
      if (city && !cities.includes(city)) cities.push(city);
    }
    priorities.push({
      id: 'new-roles',
      kind: 'newJobs',
      title: newRoles.length === 1 ? '1 new role fits your profile' : `${newRoles.length} new roles fit your profile`,
      detail: sentence(cities.slice(0, 3)),
      due: now.toISOString(),
    });
  }
  return priorities;
}

/** The endpoint's reply to office data. Anything malformed is dropped, and a reply that is not an object is refused. */
export function parseOfficePayload(raw: unknown): OfficeData | null {
  if (!isRecord(raw)) return null;
  const now = new Date(text(raw.now) ?? '');
  if (Number.isNaN(now.getTime())) return null;
  const tasks = list(raw.tasks).filter(isRecord);
  const applications = list(raw.applications);
  return {
    now,
    scoutTasks: toTasks(tasks.filter((t) => t.kind === 'review_new_roles')),
    cvTasks: toTasks(tasks.filter((t) => t.kind === 'tailor_cv')),
    scoutItems: toItems(list(raw.verdicts)),
    cvDrafts: toDrafts(list(raw.versions)),
    applications: applications.filter(isRecord).filter((a) => (STAGES as readonly string[]).includes(a.stage as string)).map((a) => ({ stage: a.stage as Stage })),
    priorities: buildPriorities(applications, list(raw.newRoles), now),
    alerts: toAlerts(list(raw.alerts)),
    lastIntake: toLastIntake(list(raw.intakes)),
  };
}

/** Reads the office data. Returns null for any failure, including being sent to the login page, so nothing fake is shown as real. */
export async function loadOffice(fetcher: typeof fetch = fetch, url = '/api/office'): Promise<OfficeData | null> {
  try {
    const res = await fetcher(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!res.ok || res.redirected) return null;
    return parseOfficePayload(await res.json());
  } catch {
    return null;
  }
}
