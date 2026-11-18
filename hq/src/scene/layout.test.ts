import { describe, expect, it } from 'vitest';
import { CREW_SIZE } from '../domain/goblins';
import { GLASS_OFFICE, GOBLIN_RADIUS } from './layout';

const { box, obstacles, spots } = GLASS_OFFICE;

describe('glass office layout', () => {
  it('has one spot for every goblin in the crew', () => expect(spots).toHaveLength(CREW_SIZE));

  it.each(spots.map((s, i) => [i, s] as const))('spot %i is inside the room with room to spare for the goblin', (_i, s) => {
    expect(s.x).toBeGreaterThanOrEqual(box.minX + GOBLIN_RADIUS);
    expect(s.x).toBeLessThanOrEqual(box.maxX - GOBLIN_RADIUS);
    expect(s.z).toBeGreaterThanOrEqual(box.minZ + GOBLIN_RADIUS);
    expect(s.z).toBeLessThanOrEqual(box.maxZ - GOBLIN_RADIUS);
  });

  it.each(spots.map((s, i) => [i, s] as const))('spot %i is clear of the desk, chair and armchairs', (_i, s) => {
    for (const o of obstacles) {
      const inside = s.x > o.minX - GOBLIN_RADIUS && s.x < o.maxX + GOBLIN_RADIUS && s.z > o.minZ - GOBLIN_RADIUS && s.z < o.maxZ + GOBLIN_RADIUS;
      expect(inside, `${o.name} blocks the spot at ${s.x}, ${s.z}`).toBe(false);
    }
  });

  it('keeps goblins at least half a metre apart', () => {
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) expect(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)).toBeGreaterThanOrEqual(0.5);
  });

  it('names the camera target inside the room', () => {
    const [x, , z] = GLASS_OFFICE.center;
    expect(x).toBeGreaterThan(box.minX);
    expect(x).toBeLessThan(box.maxX);
    expect(z).toBeGreaterThan(box.minZ);
    expect(z).toBeLessThan(box.maxZ);
  });
});

describe('door blind zone', () => {
  it('keeps every goblin out of the strip hidden behind the solid door from the default camera', () => {
    // The camera looks along (-1, -1) in the floor plane, so x minus z stays the same along a line of sight.
    // The door spans x -8.45 to -7.55 in the south wall at z 1.75, so it hides lines with x - z between -10.2 and -9.3.
    const lo = -10.2 - GOBLIN_RADIUS * Math.SQRT2;
    const hi = -9.3 + GOBLIN_RADIUS * Math.SQRT2;
    for (const s of spots) {
      const line = s.x - s.z;
      expect(line < lo || line > hi || s.z > 1.75, `spot ${s.x}, ${s.z} is hidden by the door`).toBe(true);
    }
  });
});
