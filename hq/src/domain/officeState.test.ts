import { describe, expect, it } from 'vitest';
import type { OfficeData } from '../data/officeData';
import { buildOfficeState } from './officeState';
import { SAMPLE_ALERTS, SAMPLE_CV_DRAFTS, SAMPLE_SCOUT_ITEMS } from './sample';

const NOW = new Date('2026-11-19T10:00:00Z');
const live = (over: Partial<OfficeData> = {}): OfficeData => ({
  now: NOW, scoutTasks: [], scoutItems: [], cvTasks: [], cvDrafts: [], applications: [], priorities: [], alerts: [], lastIntake: null, ...over,
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
  it('shows the real LinkedIn alerts and the real intake state', () => {
    const alert = { id: 'a', title: 'Data Science Trainee', company: 'Novartis España', city: 'Barcelona', href: 'https://www.linkedin.com/jobs/view/1/', fits: true, score: 70, shortlisted: true, firstSeen: '2026-11-19T07:40:00Z' };
    const s = buildOfficeState('live', live({ alerts: [alert], lastIntake: { at: '2026-11-19T07:40:00Z', received: 12, storedNew: 6, queued: 5 } }), NOW);
    expect(s.alerts).toEqual([alert]);
    expect(s.linkedinStatus).toBe('completed');
    expect(s.lastIntake?.storedNew).toBe(6);
  });
  it('shows no alerts and an idle desk when nothing was collected, loading or unreadable, and never sample alerts', () => {
    expect(buildOfficeState('live', live(), NOW).linkedinStatus).toBe('idle');
    for (const mode of ['loading', 'unavailable'] as const) {
      const s = buildOfficeState(mode, null, NOW);
      expect(s.alerts).toEqual([]);
      expect(s.lastIntake).toBeNull();
      expect(s.linkedinStatus).toBe('idle');
    }
    expect(buildOfficeState('live', live(), NOW).alerts).not.toEqual(SAMPLE_ALERTS);
  });
  it('uses clearly labelled sample alerts only in sample mode', () => {
    const s = buildOfficeState('sample', null, NOW);
    expect(s.alerts).toEqual(SAMPLE_ALERTS);
    expect(s.simulated).toBe(true);
  });
});
