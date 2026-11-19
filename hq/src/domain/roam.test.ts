import { describe, expect, it } from 'vitest';
import { GLASS_OFFICE, GOBLIN_SPACES, ROAM_RADIUS, isStandableForGoblin, isWalkableForGoblin } from '../scene/layout';
import type { ScoutStatus } from './scouting';
import { ROOF_Y, behaviorFor, frameAt, makeSchedule } from './roam';

const STATUSES: ScoutStatus[] = ['idle', 'waiting', 'working', 'completed', 'failed'];
const ROAMING: ScoutStatus[] = ['idle', 'waiting', 'working', 'completed'];
const spaces = GOBLIN_SPACES;
const tours = (status: ScoutStatus) => GLASS_OFFICE.spots.map((s, i) => makeSchedule(i + 1, { x: s.x, z: s.z }, behaviorFor(status), spaces));

describe('the goblins stay in their own room, in free space', () => {
  it.each(ROAMING)('%s: every sampled moment is inside the glass office and clear of furniture, and every stop is where the camera can see it', (status) => {
    for (const tour of tours(status)) {
      for (let t = 0; t < tour.period * 2; t += 0.1) {
        const f = frameAt(tour, t);
        expect(isWalkableForGoblin(f.x, f.z), `${status} at ${t.toFixed(1)}s is at ${f.x.toFixed(2)}, ${f.z.toFixed(2)}`).toBe(true);
        if (f.move !== 'walk') expect(isStandableForGoblin(f.x, f.z), `${status} stops at ${f.x.toFixed(2)}, ${f.z.toFixed(2)} out of sight`).toBe(true);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y).toBeLessThanOrEqual(ROOF_Y + 1e-6);
      }
    }
  });
  it('starts every goblin on one of the room spots, which are free for the bigger goblin', () => {
    for (const s of GLASS_OFFICE.spots) expect(GOBLIN_SPACES.standable(s.x, s.z), `${s.x}, ${s.z}`).toBe(true);
    expect(ROAM_RADIUS).toBeGreaterThanOrEqual(0.15);
  });
});

describe('the route', () => {
  it('is the same every time for the same seed, and different for another seed', () => {
    const a = makeSchedule(3, { x: -9.1, z: 1.45 }, behaviorFor('working'), spaces);
    const b = makeSchedule(3, { x: -9.1, z: 1.45 }, behaviorFor('working'), spaces);
    const c = makeSchedule(4, { x: -9.1, z: 1.45 }, behaviorFor('working'), spaces);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
  it.each(ROAMING)('%s: is a closed loop, so the goblin never jumps back to its start', (status) => {
    for (const tour of tours(status)) {
      const end = frameAt(tour, tour.period - 1e-6);
      const start = frameAt(tour, 0);
      expect(Math.hypot(end.x - start.x, end.z - start.z)).toBeLessThan(0.05);
    }
  });
  it.each(ROAMING)('%s: never walks faster than its walking speed', (status) => {
    const speed = behaviorFor(status).speed;
    for (const tour of tours(status)) {
      let prev = frameAt(tour, 0);
      for (let t = 0.05; t < tour.period; t += 0.05) {
        const f = frameAt(tour, t);
        expect(Math.hypot(f.x - prev.x, f.z - prev.z)).toBeLessThanOrEqual(speed * 0.05 * 1.05 + 1e-9);
        prev = f;
      }
    }
  });
  it('faces the way it walks', () => {
    const tour = tours('working')[0];
    for (let t = 0.2; t < tour.period; t += 0.2) {
      const f = frameAt(tour, t);
      if (f.move !== 'walk') continue;
      const next = frameAt(tour, t + 0.05);
      if (next.move !== 'walk' || next.heading !== f.heading) continue; // this step crosses a corner into the next stretch
      const dx = next.x - f.x;
      const dz = next.z - f.z;
      if (Math.hypot(dx, dz) < 1e-6) continue;
      const want = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(f.heading - want), Math.cos(f.heading - want));
      expect(Math.abs(diff)).toBeLessThan(0.1);
    }
  });
});

describe('the energy follows the real status', () => {
  it('has no movement at all when Scouting failed: the crew stays slumped where it is', () => {
    expect(behaviorFor('failed').roam).toBe(false);
    for (const tour of tours('failed')) {
      for (let t = 0; t < 60; t += 3) {
        const f = frameAt(tour, t);
        expect(f.y).toBe(0);
        expect(f.flip).toBe(0);
        expect(f.move).toBe('pause');
      }
      expect(frameAt(tour, 10).x).toBe(frameAt(tour, 0).x);
    }
  });
  it('has calm goblins when idle (no roof drops) and a party when completed (many roof drops and flips)', () => {
    const count = (status: ScoutStatus, move: string) => tours(status).flatMap((t) => t.segments).filter((s) => s.move === move).length;
    expect(count('idle', 'drop')).toBe(0);
    expect(count('completed', 'drop')).toBeGreaterThan(count('working', 'drop'));
    expect(count('completed', 'drop') + count('completed', 'flip')).toBeGreaterThan(count('idle', 'flip') + count('idle', 'drop'));
    expect(count('working', 'drop')).toBeGreaterThan(0);
  });
  it('walks faster the more active the status is', () => {
    const s = (st: ScoutStatus) => behaviorFor(st).speed;
    expect(s('idle')).toBeLessThan(s('working'));
    expect(s('working')).toBeLessThanOrEqual(s('completed'));
  });
  it('knows every status', () => {
    for (const st of STATUSES) expect(behaviorFor(st)).toBeDefined();
  });
});

describe('hops, backflips and drops from the roof', () => {
  const stunt = (move: 'hop' | 'flip' | 'drop') => {
    for (const status of ['completed', 'working'] as const) {
      for (const tour of tours(status)) {
        const seg = tour.segments.find((s) => s.move === move);
        if (seg) return { tour, seg };
      }
    }
    throw new Error(`no ${move} found`);
  };
  it('a roof drop goes up to the roof, comes down in a backflip and lands on its feet', () => {
    const { tour, seg } = stunt('drop');
    let top = 0;
    let flipped = 0;
    for (let u = 0; u <= 1; u += 0.01) {
      const f = frameAt(tour, seg.start + u * seg.duration - (u === 1 ? 1e-6 : 0));
      top = Math.max(top, f.y);
      flipped = Math.max(flipped, Math.abs(f.flip));
    }
    expect(top).toBeGreaterThan(ROOF_Y * 0.9);
    expect(flipped).toBeGreaterThan(Math.PI * 1.9);
    const end = frameAt(tour, seg.start + seg.duration - 1e-6);
    expect(end.y).toBeLessThan(0.02);
    expect(Math.abs(Math.sin(end.flip / 2))).toBeLessThan(0.05); // a whole number of turns: upright again
    expect(frameAt(tour, seg.start).y).toBeLessThan(0.02);
  });
  it('a backflip from the floor turns once all the way round and lands on the same spot', () => {
    const { tour, seg } = stunt('flip');
    const a = frameAt(tour, seg.start);
    const b = frameAt(tour, seg.start + seg.duration - 1e-6);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.01);
    expect(Math.abs(Math.sin(b.flip / 2))).toBeLessThan(0.05);
    const mid = frameAt(tour, seg.start + seg.duration / 2);
    expect(mid.y).toBeGreaterThan(0.3);
  });
  it('a hop stays small and does not turn', () => {
    const { tour, seg } = stunt('hop');
    for (let u = 0; u < 1; u += 0.05) {
      const f = frameAt(tour, seg.start + u * seg.duration);
      expect(f.y).toBeLessThan(0.5);
      expect(f.flip).toBe(0);
    }
  });
});
