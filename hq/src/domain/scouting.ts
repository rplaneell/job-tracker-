export type TaskStatus = 'queued' | 'claimed' | 'done' | 'failed';

export interface AgentTask {
  id: string;
  status: TaskStatus;
  claimedAt: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface Verdict {
  roleId: string;
  score: number;
  reason: string;
  shortlisted: boolean;
}

export type ScoutStatus = 'idle' | 'waiting' | 'working' | 'completed' | 'failed';

/** The words shown for each status, in the panel and above the goblins, so both always agree. */
export const STATUS_LABEL: Record<ScoutStatus, string> = {
  idle: 'Idle',
  waiting: 'Waiting for Claude Code',
  working: 'Working with Claude Code',
  completed: 'Finished its latest review',
  failed: 'Failed',
};

/** A claim older than this is treated as abandoned: the task goes back in the queue. */
export const STALE_CLAIM_MINUTES = 30;
/** How long a finished run is still shown as "completed" before the office goes back to idle. */
export const COMPLETED_HOURS = 24;

const MINUTE = 60_000;

function ageMs(iso: string | null, now: Date): number {
  const t = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : now.getTime() - t; // unreadable dates count as very old
}

/** The office shows only what the newest task really says. Nothing is invented. */
export function scoutStatus(tasks: AgentTask[], now: Date): ScoutStatus {
  if (tasks.length === 0) return 'idle';
  const created = (t: AgentTask) => new Date(t.createdAt).getTime() || 0;
  const latest = tasks.reduce((a, b) => (created(b) >= created(a) ? b : a));
  switch (latest.status) {
    case 'queued':
      return 'waiting';
    case 'claimed':
      return ageMs(latest.claimedAt, now) < STALE_CLAIM_MINUTES * MINUTE ? 'working' : 'waiting';
    case 'failed':
      return 'failed';
    case 'done':
      return ageMs(latest.finishedAt, now) < COMPLETED_HOURS * 60 * MINUTE ? 'completed' : 'idle';
  }
}

/** The agent's own shortlist: best score first, a longer written reason wins a tie. Returns a new list. */
export function shortlist<T extends Verdict>(verdicts: T[], limit: number): T[] {
  if (!(limit > 0)) return [];
  return verdicts
    .filter((v) => v.shortlisted)
    .sort((a, b) => b.score - a.score || b.reason.length - a.reason.length)
    .slice(0, Math.floor(limit));
}

const SCOUT_STATUSES: readonly string[] = ['idle', 'waiting', 'working', 'completed', 'failed'];

/** Lets a link such as ?sim=working preview a status in simulation mode. Anything unknown is ignored. */
export function parseSimStatus(search: string, key = 'sim'): ScoutStatus | null {
  const value = new URLSearchParams(search).get(key);
  return value !== null && SCOUT_STATUSES.includes(value) ? (value as ScoutStatus) : null;
}
