import { describe, expect, it } from 'vitest';
import type { OfficeData } from '../data/officeData';
import { buildOfficeState } from './officeState';
import { SAMPLE_CV_DRAFTS, SAMPLE_SCOUT_ITEMS } from './sample';

const NOW = new Date('2026-11-19T10:00:00Z');
const live = (over: Partial<OfficeData> = {}): OfficeData => ({
  now: NOW, scoutTasks: [], scoutItems: [], cvTasks: [], cvDrafts: [], applications: [], priorities: [], ...over,
});

describe('buildOfficeState', () => {
  it('shows the real data and no simulation label when the data was read', () => {
    const s = buildOfficeState('live', live({ applications: [{ stage: 'applied' }], scoutItems: [{ roleId: 'r', score: 80, reason: 'ok', shortlisted: true, title: 'Analyst', company: 'Acme' }] }), NOW);
    expect(s.simulated).toBe(false);
    expect(s.source).toBe('live');
    expect(s.notice).toBeNull();
    expect(s.scoutItems).toHaveLength(1);
    expect(s.view.counts.applied).toBe(1);
  });
  it('never shows sample content in the live state, even when the database is empty', () => {
    const s = buildOfficeState('live', live(), NOW);
    expect(s.scoutItems).toEqual([]);
    expect(s.cvDrafts).toEqual([]);
    expect(s.view.active).toBe(0);
    expect(s.line).toContain('Nothing needs you right now');
  });
  it('shows nothing invented while loading or when the data could not be read', () => {
    for (const mode of ['loading', 'unavailable'] as const) {
      const s = buildOfficeState(mode, null, NOW);
      expect(s.scoutItems).toEqual([]);
      expect(s.cvDrafts).toEqual([]);
      expect(s.view.active).toBe(0);
      expect(s.simulated).toBe(false);
    }
    expect(buildOfficeState('loading', null, NOW).line).toMatch(/reading your data/i);
    for (const mode of ['loading', 'unavailable'] as const) {
      const s = buildOfficeState(mode, null, NOW);
      expect(s.source).toBe('none'); // the panels must not claim live data
      expect(s.view.headline).not.toMatch(/nothing needs you/i); // and must not reassure when nothing was read
    }
    expect(buildOfficeState('unavailable', null, NOW).view.headline).toMatch(/could not read your data/i);
    expect(buildOfficeState('unavailable', null, NOW).notice).toMatch(/could not read your data/i);
  });
  it('uses clearly labelled sample data only in sample mode', () => {
    const s = buildOfficeState('sample', null, NOW);
    expect(s.simulated).toBe(true);
    expect(s.source).toBe('simulation');
    expect(s.scoutItems).toEqual(SAMPLE_SCOUT_ITEMS);
    expect(s.cvDrafts).toEqual(SAMPLE_CV_DRAFTS);
  });
  it('greets by the time of day of the data', () => {
    expect(buildOfficeState('live', live(), new Date('2026-11-19T08:00:00')).line.startsWith('Good morning')).toBe(true);
  });
});
