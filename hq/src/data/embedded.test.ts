import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The office is committed into the dashboard (web/public/hq) so the dashboard builds without needing this folder.
// These tests fail when that copy is missing or out of date: run `npm run build:office` in web, then commit.
const EMBED = '../web/public/hq';

describe('the office copy inside the dashboard', () => {
  it('has a page that points only at files that exist', () => {
    const html = readFileSync(`${EMBED}/index.html`, 'utf8');
    const refs = [...html.matchAll(/(?:src|href)="\/hq\/([^"]+)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(existsSync(`${EMBED}/${ref}`), ref).toBe(true);
  });
  it('has every 3D model, byte for byte', () => {
    for (const file of readdirSync('public/models')) {
      expect(existsSync(`${EMBED}/models/${file}`), file).toBe(true);
      expect(readFileSync(`${EMBED}/models/${file}`).equals(readFileSync(`public/models/${file}`)), file).toBe(true);
    }
  });
  it('was built from the current source (its page title and the brand mark match)', () => {
    expect(readFileSync(`${EMBED}/index.html`, 'utf8')).toContain('<title>the climb</title>');
    expect(readFileSync(`${EMBED}/brand/the-climb-mark.png`).equals(readFileSync('public/brand/the-climb-mark.png'))).toBe(true);
  });
  it('is built with the /hq/ base so the page works at that address', () => {
    expect(readFileSync(`${EMBED}/index.html`, 'utf8')).toContain('/hq/assets/');
  });
});
