export const STAGES = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected'] as const;
export type Stage = (typeof STAGES)[number];

export type PriorityKind = 'interview' | 'deadline' | 'followUp' | 'newJobs';

export interface Priority {
  id: string;
  kind: PriorityKind;
  title: string;
  detail: string;
  /** When it needs attention, as an ISO date and time. */
  due: string;
}

const IMPORTANCE: Record<PriorityKind, number> = { interview: 0, deadline: 1, followUp: 2, newJobs: 3 };

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function time(due: string): number {
  const t = new Date(due).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t; // an unreadable date sorts last
}

/** Overdue first, then the soonest. Ties go to the more important kind. Returns a new list. */
export function rankPriorities(items: Priority[], now: Date): Priority[] {
  const nowMs = now.getTime();
  const group = (p: Priority) => (time(p.due) < nowMs ? 0 : 1);
  return [...items].sort(
    (a, b) => group(a) - group(b) || time(a.due) - time(b.due) || IMPORTANCE[a.kind] - IMPORTANCE[b.kind],
  );
}

export function overdueCount(items: Priority[], now: Date): number {
  return items.filter((p) => time(p.due) < now.getTime()).length;
}

export function stageCounts(applications: { stage: Stage }[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const a of applications) if (a.stage in counts) counts[a.stage] += 1;
  return counts;
}

export interface ReceptionView {
  greeting: string;
  headline: string;
  overdue: number;
  top: Priority[];
  counts: Record<Stage, number>;
  /** Roles still in play: everything except rejected. */
  active: number;
}

export function buildReceptionView(
  priorities: Priority[],
  applications: { stage: Stage }[],
  now: Date,
): ReceptionView {
  const ranked = rankPriorities(priorities, now);
  const overdue = overdueCount(ranked, now);
  const counts = stageCounts(applications);
  const waiting = ranked.length - overdue;
  let headline = 'Nothing needs you right now.';
  if (overdue && waiting) headline = `${overdue} overdue and ${waiting} more coming up today.`;
  else if (overdue) headline = `${overdue} overdue.`;
  else if (waiting) headline = `${waiting} coming up today.`;
  return {
    greeting: greeting(now),
    headline,
    overdue,
    top: ranked.slice(0, 3),
    counts,
    active: applications.length - counts.rejected,
  };
}
