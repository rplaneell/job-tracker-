import { describe, expect, it } from 'vitest';
import { scoutStatus, shortlist, type AgentTask, type Verdict } from './scouting';

const now = new Date('2026-11-18T12:00:00Z');
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const task = (over: Partial<AgentTask>): AgentTask => ({
  id: 't', status: 'queued', claimedAt: null, createdAt: minutesAgo(5), finishedAt: null, ...over,
});

describe('scoutStatus', () => {
  it('is idle with no tasks', () => expect(scoutStatus([], now)).toBe('idle'));
  it('is waiting when a task is queued', () => expect(scoutStatus([task({})], now)).toBe('waiting'));
  it('is working when claimed under 30 minutes ago', () =>
    expect(scoutStatus([task({ status: 'claimed', claimedAt: minutesAgo(29) })], now)).toBe('working'));
  it('goes back to waiting when a claim is 30 minutes old or more', () =>
    expect(scoutStatus([task({ status: 'claimed', claimedAt: minutesAgo(30) })], now)).toBe('waiting'));
  it('is completed when the latest task finished within 24 hours', () =>
    expect(scoutStatus([task({ status: 'done', finishedAt: minutesAgo(60) })], now)).toBe('completed'));
  it('is idle when the latest finished task is over 24 hours old', () =>
    expect(scoutStatus([task({ status: 'done', finishedAt: minutesAgo(25 * 60) })], now)).toBe('idle'));
  it('is failed when the latest task failed', () =>
    expect(scoutStatus([task({ status: 'failed', finishedAt: minutesAgo(10) })], now)).toBe('failed'));
  it('looks at the newest task, not the oldest', () =>
    expect(
      scoutStatus([task({ id: 'old', status: 'failed', createdAt: minutesAgo(500), finishedAt: minutesAgo(400) }), task({ id: 'new', status: 'queued' })], now),
    ).toBe('waiting'));
  it('treats an unreadable claim date as stale, never as working', () =>
    expect(scoutStatus([task({ status: 'claimed', claimedAt: 'garbage' })], now)).toBe('waiting'));
});

const v = (roleId: string, score: number, reason = 'a fine reason'): Verdict => ({ roleId, score, reason, shortlisted: true });

describe('shortlist', () => {
  it('orders by score, highest first', () =>
    expect(shortlist([v('a', 60), v('b', 90), v('c', 75)], 5).map((x) => x.roleId)).toEqual(['b', 'c', 'a']));
  it('breaks ties with the longer reason', () =>
    expect(shortlist([v('a', 80, 'short reason'), v('b', 80, 'a much longer reason here')], 5).map((x) => x.roleId)).toEqual(['b', 'a']));
  it('never returns more than the limit', () => expect(shortlist([v('a', 1), v('b', 2), v('c', 3)], 2)).toHaveLength(2));
  it('returns nothing for a limit of zero or less', () => {
    expect(shortlist([v('a', 1)], 0)).toEqual([]);
    expect(shortlist([v('a', 1)], -3)).toEqual([]);
  });
  it('only includes verdicts the agent marked shortlisted', () =>
    expect(shortlist([{ ...v('a', 99), shortlisted: false }, v('b', 10)], 5).map((x) => x.roleId)).toEqual(['b']));
  it('does not change the list it was given', () => {
    const input = [v('a', 1), v('b', 2)];
    shortlist(input, 5);
    expect(input.map((x) => x.roleId)).toEqual(['a', 'b']);
  });
});
