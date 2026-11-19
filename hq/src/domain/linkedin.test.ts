import { describe, expect, it } from 'vitest';
import { describeIntake, deskStatus, safeLinkedInHref } from './linkedin';

describe('safeLinkedInHref', () => {
  it('accepts a plain LinkedIn job page link', () => {
    expect(safeLinkedInHref('https://www.linkedin.com/jobs/view/4491729316/')).toBe('https://www.linkedin.com/jobs/view/4491729316/');
    expect(safeLinkedInHref('https://es.linkedin.com/jobs/view/123456/')).toBe('https://es.linkedin.com/jobs/view/123456/');
  });
  it('refuses everything else: other hosts, lookalikes, other schemes, other pages, junk', () => {
    for (const bad of [
      'http://www.linkedin.com/jobs/view/4491729316/',
      'https://evil.example/jobs/view/4491729316/',
      'https://linkedin.com.evil.example/jobs/view/4491729316/',
      'https://notlinkedin.com/jobs/view/4491729316/',
      'javascript:alert(1)',
      'https://www.linkedin.com/in/someone',
      'https://www.linkedin.com/jobs/view/not-a-number/',
      '', null, undefined, 5,
    ]) expect(safeLinkedInHref(bad as never), String(bad)).toBeNull();
  });
});

describe('deskStatus', () => {
  const now = new Date('2026-11-19T10:00:00Z');
  it('is completed when alerts were collected in the last 36 hours, otherwise idle', () => {
    expect(deskStatus('2026-11-19T07:40:00Z', now)).toBe('completed');
    expect(deskStatus('2026-11-18T00:00:00Z', now)).toBe('completed');
    expect(deskStatus('2026-11-17T21:59:00Z', now)).toBe('idle');
    expect(deskStatus(null, now)).toBe('idle');
    expect(deskStatus('not a date', now)).toBe('idle');
  });
});

describe('describeIntake', () => {
  it('reads three counts from an audit entry and ignores everything else', () => {
    expect(describeIntake({ received: 12, stored_new: 6, queued_for_scouting: 5, dropped: { 'outside your regions': 6 }, title: 'secret' })).toEqual({ received: 12, storedNew: 6, queued: 5 });
  });
  it('treats missing or odd values as zero', () => {
    expect(describeIntake({ received: 'x', stored_new: -3, queued_for_scouting: 1.5 })).toEqual({ received: 0, storedNew: 0, queued: 0 });
    expect(describeIntake(null)).toEqual({ received: 0, storedNew: 0, queued: 0 });
  });
});
