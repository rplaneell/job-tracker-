import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CvPanel, type CvDraft } from './CvPanel';

const draft = (id: string, over: Partial<CvDraft> = {}): CvDraft => ({ id, title: `Role ${id}`, company: 'Acme', status: 'draft', ...over });
const html = (props: Partial<Parameters<typeof CvPanel>[0]>) =>
  renderToStaticMarkup(<CvPanel status="idle" drafts={[]} source="live" onClose={() => {}} {...props} />);

describe('CvPanel', () => {
  it.each([
    ['idle', 'Idle'],
    ['waiting', 'Waiting for Claude Code'],
    ['working', 'Working with Claude Code'],
    ['completed', 'Finished its latest draft'],
    ['failed', 'Failed'],
  ] as const)('shows the %s status as "%s"', (status, label) => expect(html({ status })).toContain(label));

  it('marks simulated data clearly and live data not', () => {
    expect(html({ source: 'simulation' })).toContain('Simulation');
    expect(html({ source: 'live' })).not.toContain('Simulation');
  });

  it('lists the latest drafts with their approval status', () => {
    const out = html({ drafts: [draft('1'), draft('2', { status: 'approved' })] });
    expect(out).toContain('Role 1');
    expect(out).toContain('approved');
  });

  it('says plainly when there are no drafts yet', () => expect(html({ drafts: [] })).toContain('No drafts yet'));

  it('explains the one rule: it only rewords what is in the master CV', () => expect(html({})).toContain('only reorders and rewords'));

  it('escapes text from companies', () => {
    const out = html({ drafts: [draft('x', { title: '<script>alert(1)</script>', company: '<img src=x onerror=alert(1)>' })] });
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;script&gt;');
  });

  it('labels the panel and has a close button', () => {
    const out = html({});
    expect(out).toContain('aria-label="CV Tailor"');
    expect(out).toContain('aria-label="Close CV Tailor"');
  });
});
