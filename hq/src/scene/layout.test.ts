import { describe, expect, it } from 'vitest';
import { CREW_SIZE } from '../domain/goblins';
import { GLASS_OFFICE, GOBLIN_RADIUS, LINKEDIN_STATION } from './layout';

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

import { CV_STATION, OFFICE as OFFICE_PLAN } from './layout';

describe('CV Tailor station', () => {
  const { spot, obstacles, radius } = CV_STATION;

  it('is on the floor of the building', () => {
    expect(spot.x).toBeGreaterThan(-9.9);
    expect(spot.x).toBeLessThan(-0.1);
    expect(spot.z).toBeGreaterThan(0.1);
    expect(spot.z).toBeLessThan(9.9);
  });

  it.each(obstacles.map((o) => [o.name, o] as const))('is clear of the %s', (_name, o) => {
    const inside = spot.x > o.minX - radius && spot.x < o.maxX + radius && spot.z > o.minZ - radius && spot.z < o.maxZ + radius;
    expect(inside).toBe(false);
  });

  it('is not in the glass office and not on top of the reception desk', () => {
    const g = GLASS_OFFICE.box;
    expect(spot.x > g.minX && spot.x < g.maxX && spot.z > g.minZ && spot.z < g.maxZ).toBe(false);
    expect(Math.hypot(spot.x - OFFICE_PLAN.desk.center[0], spot.z - OFFICE_PLAN.desk.center[2])).toBeGreaterThan(2);
  });

  it('is at least a metre from every goblin', () => {
    for (const s of GLASS_OFFICE.spots) expect(Math.hypot(spot.x - s.x, spot.z - s.z)).toBeGreaterThan(1);
  });
});

describe('LinkedIn desk', () => {
  const { spot, obstacles, radius, table } = LINKEDIN_STATION;

  it('is on the floor of the building', () => {
    for (const p of [spot, { x: table.minX, z: table.minZ }, { x: table.maxX, z: table.maxZ }]) {
      expect(p.x).toBeGreaterThan(-9.9);
      expect(p.x).toBeLessThan(-0.1);
      expect(p.z).toBeGreaterThan(0.1);
      expect(p.z).toBeLessThan(9.9);
    }
  });

  it.each(obstacles.map((o) => [o.name, o] as const))('keeps the person clear of the %s', (_name, o) => {
    const inside = spot.x > o.minX - radius && spot.x < o.maxX + radius && spot.z > o.minZ - radius && spot.z < o.maxZ + radius;
    expect(inside).toBe(false);
  });

  it('keeps the person clear of its own table, with the table in front of them from the default camera', () => {
    expect(spot.z + radius).toBeLessThan(table.minZ);
    expect(spot.x).toBeGreaterThan(table.minX);
    expect(spot.x).toBeLessThan(table.maxX);
  });

  it('is outside the glass Scouting room, away from the reception desk, the CV Tailor and every goblin spot', () => {
    const g = GLASS_OFFICE.box;
    expect(spot.x > g.minX && spot.x < g.maxX && spot.z > g.minZ && spot.z < g.maxZ).toBe(false);
    expect(Math.hypot(spot.x - OFFICE_PLAN.desk.center[0], spot.z - OFFICE_PLAN.desk.center[2])).toBeGreaterThan(2);
    expect(Math.hypot(spot.x - CV_STATION.spot.x, spot.z - CV_STATION.spot.z)).toBeGreaterThan(2);
    for (const s of GLASS_OFFICE.spots) expect(Math.hypot(spot.x - s.x, spot.z - s.z)).toBeGreaterThan(2);
  });

  it('looks at the middle of the desk when the camera is on it', () => {
    const [cx, , cz] = LINKEDIN_STATION.center;
    expect(cx).toBeGreaterThan(table.minX - 0.5);
    expect(cx).toBeLessThan(table.maxX + 0.5);
    expect(cz).toBeGreaterThan(spot.z - 0.5);
    expect(cz).toBeLessThan(table.maxZ + 0.5);
  });
});
