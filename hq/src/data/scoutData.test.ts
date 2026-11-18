import { describe, expect, it } from 'vitest';
import { loadScout, toItems, toTasks } from './scoutData';

const taskRow = { id: 't1', status: 'claimed', claimed_at: '2026-11-18T06:00:00Z', created_at: '2026-11-18T05:00:00Z', finished_at: null };
const verdictRow = { role_id: 'r1', score: 88, reason: 'Junior consulting role in Zurich', shortlisted: true, roles: { title: 'Analyst', company: 'Acme' } };

describe('toTasks', () => {
  it('maps database rows to tasks', () =>
    expect(toTasks([taskRow])).toEqual([{ id: 't1', status: 'claimed', claimedAt: '2026-11-18T06:00:00Z', createdAt: '2026-11-18T05:00:00Z', finishedAt: null }]));
  it('drops rows with an unknown status or a missing id', () =>
    expect(toTasks([{ ...taskRow, status: 'exploded' }, { ...taskRow, id: null }, taskRow])).toHaveLength(1));
  it('survives garbage instead of throwing', () => expect(toTasks([null, 5, 'x', undefined, {}])).toEqual([]));
  it('returns nothing for a non list', () => expect(toTasks(undefined as unknown as unknown[])).toEqual([]));
});

describe('toItems', () => {
  it('maps verdicts with the role title and company', () =>
    expect(toItems([verdictRow])).toEqual([{ roleId: 'r1', score: 88, reason: 'Junior consulting role in Zurich', shortlisted: true, title: 'Analyst', company: 'Acme' }]));
  it('drops verdicts with a score outside 0 to 100 or not a number', () =>
    expect(toItems([{ ...verdictRow, score: 101 }, { ...verdictRow, score: '90' }, { ...verdictRow, score: -1 }, verdictRow])).toHaveLength(1));
  it('uses safe placeholders when the role is missing', () =>
    expect(toItems([{ ...verdictRow, roles: null }])[0]).toMatchObject({ title: 'Unknown role', company: '' }));
  it('keeps text as plain strings, never markup to run', () =>
    expect(toItems([{ ...verdictRow, reason: '<img src=x onerror=alert(1)> good fit' }])[0].reason).toBe('<img src=x onerror=alert(1)> good fit'));
});

function fakeClient(tasks: unknown, verdicts: unknown, fail?: string) {
  return {
    from: (table: string) => ({
      select: () => ({
        order: () => ({ limit: async () => (fail ? { data: null, error: { message: fail } } : { data: table === 'agent_tasks' ? tasks : verdicts, error: null }) }),
      }),
    }),
  };
}

describe('loadScout', () => {
  it('loads tasks and verdicts', async () => {
    const out = await loadScout(fakeClient([taskRow], [verdictRow]));
    expect(out.tasks).toHaveLength(1);
    expect(out.items).toHaveLength(1);
  });
  it('fails loudly instead of showing empty data as if it were real', async () => {
    await expect(loadScout(fakeClient(null, null, 'permission denied'))).rejects.toThrow('permission denied');
  });
});
