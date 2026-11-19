import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OFFICE_LINKS } from './links';

// The office is served inside the dashboard project, so every link must land on a real dashboard page.
describe('OFFICE_LINKS', () => {
  it.each(OFFICE_LINKS)('$label goes to a page that exists', ({ href }) => {
    expect(href.startsWith('/')).toBe(true);
    expect(href.startsWith('//')).toBe(false);
    expect(existsSync(`../web/src/app/(app)${href}/page.tsx`)).toBe(true);
  });
  it('lists each destination once', () => {
    expect(new Set(OFFICE_LINKS.map((l) => l.href)).size).toBe(OFFICE_LINKS.length);
  });
});
