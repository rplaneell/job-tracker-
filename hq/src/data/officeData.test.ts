import { describe, expect, it } from 'vitest';
import { loadOffice, parseOfficePayload } from './officeData';

const NOW = '2026-11-19T10:00:00Z';
const task = (over: Record<string, unknown> = {}) => ({ id: 't1', kind: 'review_new_roles', status: 'done', claimed_at: null, created_at: '2026-11-19T07:00:00Z', finished_at: null, ...over });
const payload = (over: Record<string, unknown> = {}) => ({
  now: NOW, tasks: [], verdicts: [], versions: [], applications: [], newRoles: [], alerts: [], intakes: [], ...over,
});

describe('parseOfficePayload', () => {
  it('rejects anything that is not an object with a time', () => {
    expect(parseOfficePayload(null)).toBeNull();
    expect(parseOfficePayload('x')).toBeNull();
    expect(parseOfficePayload({ tasks: [] })).toBeNull();
    expect(parseOfficePayload({ ...payload(), now: 'not a date' })).toBeNull();
  });
  it('splits agent tasks by kind', () => {
    const d = parseOfficePayload(payload({ tasks: [task({ id: 's' }), task({ id: 'c', kind: 'tailor_cv' }), task({ id: 'x', kind: 'something_else' })] }))!;
    expect(d.scoutTasks.map((t) => t.id)).toEqual(['s']);
    expect(d.cvTasks.map((t) => t.id)).toEqual(['c']);
  });
  it('turns verdict rows into shortlist items and drops bad scores', () => {
    const d = parseOfficePayload(payload({ verdicts: [
      { role_id: 'r1', score: 82, reason: 'fits', shortlisted: true, roles: { title: 'Analyst', company: 'Acme' } },
      { role_id: 'r2', score: 500, reason: 'bad', shortlisted: false, roles: {} },
    ] }))!;
    expect(d.scoutItems).toHaveLength(1);
    expect(d.scoutItems[0]).toMatchObject({ title: 'Analyst', company: 'Acme', score: 82, shortlisted: true });
  });
  it('turns cv versions into drafts and drops unknown statuses', () => {
    const d = parseOfficePayload(payload({ versions: [
      { id: 'v1', status: 'draft', roles: { title: 'Analyst', company: 'Acme' } },
      { id: 'v2', status: 'approved', roles: { title: 'Intern', company: 'Beta' } },
      { id: 'v3', status: 'deleted', roles: {} },
      { status: 'draft' },
    ] }))!;
    expect(d.cvDrafts.map((x) => [x.id, x.status])).toEqual([['v1', 'draft'], ['v2', 'approved']]);
  });
  it('keeps only applications with a real stage', () => {
    const d = parseOfficePayload(payload({ applications: [{ stage: 'applied' }, { stage: 'offer' }, { stage: 'nonsense' }, null] }))!;
    expect(d.applications.map((a) => a.stage)).toEqual(['applied', 'offer']);
  });
  it('asks for a follow up only after seven full days without news', () => {
    const app = (days: number, stage = 'applied') => ({ stage, applied_at: new Date(Date.parse(NOW) - days * 86_400_000).toISOString(), roles: { title: 'Analyst', company: 'Acme' } });
    const d = parseOfficePayload(payload({ applications: [app(6.9), app(7), app(12), app(30, 'interview'), { stage: 'applied', applied_at: null, roles: {} }] }))!;
    const follow = d.priorities.filter((p) => p.kind === 'followUp');
    expect(follow).toHaveLength(2);
    expect(follow[0].title).toBe('Follow up with Acme');
    expect(follow[0].detail).toMatch(/Applied \d+ days ago/);
  });
  it('mentions new roles that fit the profile, with up to three cities, only when there are some', () => {
    expect(parseOfficePayload(payload())!.priorities.filter((p) => p.kind === 'newJobs')).toEqual([]);
    const d = parseOfficePayload(payload({ newRoles: [{ city: 'Zurich' }, { city: 'Zurich' }, { city: 'Geneva' }, { city: 'Basel' }, { city: 'Bern' }, { city: null }] }))!;
    const jobs = d.priorities.filter((p) => p.kind === 'newJobs');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('6 new roles fit your profile');
    expect(jobs[0].detail).toBe('Zurich, Geneva and Basel');
  });
  it('says one new role in the singular', () => {
    const d = parseOfficePayload(payload({ newRoles: [{ city: 'Zurich' }] }))!;
    expect(d.priorities[0].title).toBe('1 new role fits your profile');
  });
});

describe('LinkedIn alerts in the office data', () => {
  const alert = (over: Record<string, unknown> = {}) => ({ id: 'a1', title: 'Data Science Trainee', company: 'Novartis España', city: 'Barcelona', url: 'https://www.linkedin.com/jobs/view/4490890386/', matched: true, first_seen: '2026-11-19T07:40:00Z', scout_verdicts: [{ score: 71, shortlisted: true }], ...over });
  it('reads alert roles with their link, place and Scouting score', () => {
    const d = parseOfficePayload(payload({ alerts: [alert()] }))!;
    expect(d.alerts).toEqual([{ id: 'a1', title: 'Data Science Trainee', company: 'Novartis España', city: 'Barcelona', href: 'https://www.linkedin.com/jobs/view/4490890386/', fits: true, score: 71, shortlisted: true, firstSeen: '2026-11-19T07:40:00Z' }]);
  });
  it('gives no link when the link is not a LinkedIn job page, and no score when Scouting has not judged it', () => {
    const d = parseOfficePayload(payload({ alerts: [alert({ url: 'https://evil.example/x', scout_verdicts: [] })] }))!;
    expect(d.alerts[0].href).toBeNull();
    expect(d.alerts[0].score).toBeNull();
    expect(d.alerts[0].shortlisted).toBe(false);
  });
  it('drops rows without an id or a title', () => {
    const d = parseOfficePayload(payload({ alerts: [alert({ id: undefined }), alert({ id: 'b', title: '' }), null, 'x', alert({ id: 'c' })] }))!;
    expect(d.alerts.map((a) => a.id)).toEqual(['c']);
  });
  it('reads the newest intake run as counts, and nothing when there has been none', () => {
    expect(parseOfficePayload(payload())!.lastIntake).toBeNull();
    const d = parseOfficePayload(payload({ intakes: [{ at: '2026-11-19T07:40:00Z', detail: { received: 12, stored_new: 6, queued_for_scouting: 5, title: 'x' } }, { at: '2026-11-18T07:40:00Z', detail: {} }] }))!;
    expect(d.lastIntake).toEqual({ at: '2026-11-19T07:40:00Z', received: 12, storedNew: 6, queued: 5 });
  });
});

describe('loadOffice', () => {
  const ok = (body: unknown, extra: Partial<Response> = {}) => async () => ({ ok: true, redirected: false, json: async () => body, ...extra }) as unknown as Response;
  it('returns the parsed data when the endpoint answers', async () => {
    expect((await loadOffice(ok(payload())))?.scoutTasks).toEqual([]);
  });
  it('returns null when the request fails, is redirected to the login page, or is not valid data', async () => {
    expect(await loadOffice(async () => { throw new Error('offline'); })).toBeNull();
    expect(await loadOffice(ok(payload(), { ok: false }))).toBeNull();
    expect(await loadOffice(ok(payload(), { redirected: true }))).toBeNull();
    expect(await loadOffice(async () => ({ ok: true, redirected: false, json: async () => { throw new Error('html'); } }) as unknown as Response)).toBeNull();
    expect(await loadOffice(ok({ nope: 1 }))).toBeNull();
  });
});
