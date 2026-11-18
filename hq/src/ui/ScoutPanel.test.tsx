import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScoutPanel } from './ScoutPanel';
import type { ScoutItem } from '../data/scoutData';

const item = (roleId: string, score: number, over: Partial<ScoutItem> = {}): ScoutItem => ({
  roleId, score, reason: 'A solid reason', shortlisted: true, title: `Role ${roleId}`, company: 'Acme', ...over,
});
const html = (props: Partial<Parameters<typeof ScoutPanel>[0]>) =>
  renderToStaticMarkup(<ScoutPanel status="idle" items={[]} source="live" onClose={() => {}} {...props} />);

describe('ScoutPanel', () => {
  it.each([
    ['idle', 'Idle'],
    ['waiting', 'Waiting for Claude Code'],
    ['working', 'Working with Claude Code'],
    ['completed', 'Finished its latest review'],
    ['failed', 'Failed'],
  ] as const)('shows the %s status as "%s"', (status, label) => expect(html({ status })).toContain(label));

  it('marks simulated data clearly', () => expect(html({ source: 'simulation' })).toContain('Simulation'));
  it('does not claim simulation for live data', () => expect(html({ source: 'live' })).not.toContain('Simulation'));

  it('lists the top five shortlisted roles, best first, with their reasons', () => {
    const items = [1, 2, 3, 4, 5, 6].map((n) => item(String(n), n * 10));
    const out = html({ items });
    expect(out).toContain('Role 6');
    expect(out).not.toContain('Role 1<');
    expect(out.indexOf('Role 6')).toBeLessThan(out.indexOf('Role 5'));
    expect(out).toContain('A solid reason');
  });

  it('says plainly when there is nothing shortlisted yet', () => expect(html({ items: [] })).toContain('Nothing shortlisted yet'));

  it('escapes text written by companies or the agent', () => {
    const out = html({ items: [item('x', 90, { title: '<script>alert(1)</script>', reason: '<img src=x onerror=alert(1)>' })] });
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('labels the panel and has a close button', () => {
    const out = html({});
    expect(out).toContain('aria-label="Scouting"');
    expect(out).toContain('aria-label="Close Scouting"');
  });
});
