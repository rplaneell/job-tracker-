import { describe, expect, it } from 'vitest';
import { modelUrl } from './modelUrl';

describe('modelUrl', () => {
  it('points at the models folder under the base path the app is served from', () => {
    expect(modelUrl('office.glb', '/')).toBe('/models/office.glb');
    expect(modelUrl('office.glb', '/hq/')).toBe('/hq/models/office.glb');
  });
  it('copes with a base path that has no trailing slash', () => {
    expect(modelUrl('goblin.glb', '/hq')).toBe('/hq/models/goblin.glb');
  });
});
