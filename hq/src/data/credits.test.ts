import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CREDITS } from './credits';

const models = readdirSync('public/models').filter((f) => f.endsWith('.glb'));

describe('model credits', () => {
  it('has a model file to check', () => expect(models.length).toBeGreaterThan(0));
  it.each(models)('%s is credited in the app', (file) => expect(CREDITS.some((c) => c.file === file)).toBe(true));
  it.each(models)('%s is listed in LICENSES.md', (file) => expect(readFileSync('public/models/LICENSES.md', 'utf8')).toContain(file));
  it('credits only files that exist', () => {
    for (const c of CREDITS) expect(models).toContain(c.file);
  });
  it('gives every credit a title, an artist and a link to the source', () => {
    for (const c of CREDITS) {
      expect(c.title && c.author).toBeTruthy();
      expect(c.url).toMatch(/^https:\/\/sketchfab\.com\/3d-models\//);
    }
  });
});
