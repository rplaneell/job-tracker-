import { describe, expect, it } from 'vitest';
import { greeting, overdueCount, rankPriorities, stageCounts, type Priority } from './reception';

const now = new Date('2026-11-18T10:00:00Z');
const p = (id: string, kind: Priority['kind'], due: string): Priority => ({ id, kind, title: id, detail: '', due });

describe('greeting', () => {
  it('changes with the time of day', () => {
    expect(greeting(new Date('2026-11-18T07:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-11-18T14:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-11-18T20:00:00'))).toBe('Good evening');
  });
});

describe('rankPriorities', () => {
  it('puts overdue items first, then the soonest', () => {
    const ranked = rankPriorities(
      [p('later', 'followUp', '2026-11-20T09:00:00Z'), p('late', 'followUp', '2026-11-17T09:00:00Z'), p('soon', 'followUp', '2026-11-18T15:00:00Z')],
      now,
    );
    expect(ranked.map((x) => x.id)).toEqual(['late', 'soon', 'later']);
  });
  it('breaks ties by importance: interview, then deadline, then follow up, then new jobs', () => {
    const due = '2026-11-18T12:00:00Z';
    const ranked = rankPriorities([p('n', 'newJobs', due), p('f', 'followUp', due), p('d', 'deadline', due), p('i', 'interview', due)], now);
    expect(ranked.map((x) => x.id)).toEqual(['i', 'd', 'f', 'n']);
  });
  it('does not change the list it was given', () => {
    const input = [p('b', 'followUp', '2026-11-19T00:00:00Z'), p('a', 'followUp', '2026-11-18T00:00:00Z')];
    rankPriorities(input, now);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
  it('copes with an unreadable date by placing it last', () => {
    const ranked = rankPriorities([p('bad', 'followUp', 'soonish'), p('ok', 'followUp', '2026-11-19T00:00:00Z')], now);
    expect(ranked.map((x) => x.id)).toEqual(['ok', 'bad']);
  });
});

describe('overdueCount', () => {
  it('counts items due before now', () => {
    expect(overdueCount([p('a', 'followUp', '2026-11-17T00:00:00Z'), p('b', 'followUp', '2026-11-19T00:00:00Z')], now)).toBe(1);
  });
});

describe('stageCounts', () => {
  it('counts applications per stage and includes empty stages', () => {
    const counts = stageCounts([{ stage: 'applied' }, { stage: 'applied' }, { stage: 'interview' }]);
    expect(counts).toEqual({ saved: 0, applied: 2, assessment: 0, interview: 1, offer: 0, rejected: 0 });
  });
  it('ignores a stage it does not know', () => {
    expect(stageCounts([{ stage: 'mystery' as never }]).saved).toBe(0);
  });
});

import { buildReceptionView } from './reception';
import { SAMPLE_APPLICATIONS, SAMPLE_PRIORITIES } from './sample';

describe('buildReceptionView', () => {
  const view = buildReceptionView(SAMPLE_PRIORITIES, SAMPLE_APPLICATIONS, new Date('2026-11-18T10:00:00'));
  it('greets, counts what is overdue and shows the top three priorities in order', () => {
    expect(view.greeting).toBe('Good morning');
    expect(view.overdue).toBe(1);
    expect(view.top.map((x) => x.id)).toEqual(['p1', 'p2', 'p4']);
  });
  it('counts roles still in play, which excludes rejected ones', () => {
    expect(view.active).toBe(9);
  });
  it('writes a short headline for the character to say', () => {
    expect(view.headline).toBe('1 overdue and 3 more coming up today.');
  });
  it('has a calm headline when nothing is waiting', () => {
    expect(buildReceptionView([], [], new Date('2026-11-18T10:00:00')).headline).toBe('Nothing needs you right now.');
  });
});
