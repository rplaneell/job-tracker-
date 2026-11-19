import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LinkedInAlert } from '../data/officeData';
import { LinkedInPanel } from './LinkedInPanel';

const alert = (id: string, over: Partial<LinkedInAlert> = {}): LinkedInAlert => ({
  id, title: `Role ${id}`, company: 'Acme', city: 'Barcelona', href: `https://www.linkedin.com/jobs/view/${id.padStart(5, '1')}/`, fits: true, score: null, shortlisted: false, firstSeen: '2026-11-19T07:40:00Z', ...over,
});
const html = (props: Partial<Parameters<typeof LinkedInPanel>[0]> = {}) =>
  renderToStaticMarkup(<LinkedInPanel status="idle" alerts={[]} intake={null} source="live" onClose={() => {}} {...props} />);

describe('LinkedInPanel', () => {
  it.each([
    ['idle', 'Waiting for the next alerts'],
    ['completed', 'Alerts collected'],
  ] as const)('shows the %s status as "%s"', (status, label) => expect(html({ status })).toContain(label));

  it('says plainly when there are no alerts yet and how they arrive', () => {
    const out = html();
    expect(out).toContain('No LinkedIn alert jobs yet');
    expect(out).toContain('alert emails');
  });

  it('shows the counts from the latest intake run', () => {
    const out = html({ status: 'completed', intake: { at: '2026-11-19T07:40:00Z', received: 12, storedNew: 6, queued: 5 } });
    expect(out).toContain('12 jobs found');
    expect(out).toContain('6 new');
    expect(out).toContain('5 sent to Scouting');
  });

  it('lists the alert jobs with a link to each LinkedIn posting that opens in a new tab safely', () => {
    const out = html({ alerts: [alert('1'), alert('2')] });
    expect(out).toContain('Role 1');
    expect(out).toContain('href="https://www.linkedin.com/jobs/view/11111/"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('shows the Scouting score and the shortlist mark when there is one, and says waiting when Scouting has not judged it yet', () => {
    const out = html({ alerts: [alert('1', { score: 82, shortlisted: true }), alert('2')] });
    expect(out).toContain('82');
    expect(out).toContain('Shortlisted');
    expect(out).toContain('Not judged yet');
  });

  it('shows no link at all when the stored link is not a LinkedIn job page', () => {
    const out = html({ alerts: [alert('1', { href: null })] });
    expect(out).toContain('Role 1');
    expect(out).not.toContain('Open the posting');
    expect(out).not.toContain('linkedin.com');
  });

  it('puts the best scored roles first, then the newest, and caps the list', () => {
    const alerts = Array.from({ length: 30 }, (_, i) => alert(String(i + 1), { score: i, firstSeen: `2026-11-${String(10 + (i % 9)).padStart(2, '0')}T07:00:00Z` }));
    const out = html({ alerts });
    expect(out.indexOf('Role 30')).toBeLessThan(out.indexOf('Role 29'));
    expect(out).not.toContain('Role 1<');
    expect((out.match(/<article/g) ?? []).length).toBeLessThanOrEqual(12);
  });

  it('marks simulated data clearly and never claims simulation for live data', () => {
    expect(html({ source: 'simulation' })).toContain('Simulation');
    expect(html({ source: 'live' })).not.toContain('Simulation');
    expect(html({ source: 'none' })).toContain('could not be read');
  });

  it('escapes text written by companies or taken from emails', () => {
    const out = html({ alerts: [alert('x', { title: '<script>alert(1)</script>', company: '<img src=x onerror=alert(1)>' })] });
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('links back to the full list of roles in the dashboard', () => {
    expect(html()).toContain('href="/roles"');
  });
});
