import type { AgentTask, TaskStatus, Verdict } from '../domain/scouting';

export interface ScoutItem extends Verdict {
  title: string;
  company: string;
}

const STATUSES: readonly string[] = ['queued', 'claimed', 'done', 'failed'];

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const text = (x: unknown): string | null => (typeof x === 'string' ? x : null);

/** Database rows to tasks. Anything malformed is dropped, so one bad row never breaks the office. */
export function toTasks(rows: unknown[]): AgentTask[] {
  if (!Array.isArray(rows)) return [];
  const tasks: AgentTask[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = text(row.id);
    const status = text(row.status);
    const createdAt = text(row.created_at);
    if (!id || !createdAt || !status || !STATUSES.includes(status)) continue;
    tasks.push({ id, status: status as TaskStatus, claimedAt: text(row.claimed_at), createdAt, finishedAt: text(row.finished_at) });
  }
  return tasks;
}

/** Verdict rows (with the role joined in) to display items. A score outside 0 to 100 is dropped, not trusted. */
export function toItems(rows: unknown[]): ScoutItem[] {
  if (!Array.isArray(rows)) return [];
  const items: ScoutItem[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const roleId = text(row.role_id);
    const reason = text(row.reason);
    const score = row.score;
    if (!roleId || reason === null || typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) continue;
    const role = isRecord(row.roles) ? row.roles : {};
    items.push({
      roleId,
      score,
      reason,
      shortlisted: row.shortlisted === true,
      title: text(role.title) ?? 'Unknown role',
      company: text(role.company) ?? '',
    });
  }
  return items;
}

/** The small part of the Supabase client this needs, so tests can stand in for it. */
export interface ScoutClient {
  from(table: string): {
    select(columns: string): {
      order(column: string, options?: { ascending: boolean }): {
        limit(n: number): PromiseLike<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
}

async function fetchRows(client: ScoutClient, table: string, columns: string, orderBy: string): Promise<unknown[]> {
  const { data, error } = await client.from(table).select(columns).order(orderBy, { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}

/** Reads the real Scouting state. A failed read throws: an empty office is never shown as if it were real. */
export async function loadScout(client: ScoutClient): Promise<{ tasks: AgentTask[]; items: ScoutItem[] }> {
  const [taskRows, verdictRows] = await Promise.all([
    fetchRows(client, 'agent_tasks', 'id,status,claimed_at,created_at,finished_at', 'created_at'),
    fetchRows(client, 'scout_verdicts', 'role_id,score,reason,shortlisted,roles(title,company)', 'created_at'),
  ]);
  return { tasks: toTasks(taskRows), items: toItems(verdictRows) };
}
