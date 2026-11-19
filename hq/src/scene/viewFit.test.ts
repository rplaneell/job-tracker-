import { describe, expect, it } from 'vitest';
import { ARRIVAL } from '../domain/intro';
import { OFFICE } from './layout';
import { rotateDirection } from './rotation';
import { viewExtent, zoomToFit } from './viewFit';

const unitBox = { minX: -1, maxX: 1, minZ: -1, maxZ: 1, height: 2 };

/** The direction the camera has at arrival: the corner view turned round to the left, with its height scaled down. */
const BASE = [1, 1, 1].map((n) => n / Math.sqrt(3)) as [number, number, number];
const turned = rotateDirection(BASE, (ARRIVAL.yaw * Math.PI) / 180);
const ARRIVAL_DIRECTION: [number, number, number] = [turned[0], turned[1] * ARRIVAL.elevation, turned[2]];

describe('viewExtent', () => {
  it('sees a box square on as its own width and height, centred on what the camera looks at', () => {
    const e = viewExtent(unitBox, [0, 0, 1], [0, 1, 0]);
    expect(e.width).toBeCloseTo(2);
    expect(e.height).toBeCloseTo(2);
    expect(e.centerRight).toBeCloseTo(0);
    expect(e.centerUp).toBeCloseTo(0);
  });

  it('sees the same box from the corner as wider, by the diagonal of its floor', () => {
    const e = viewExtent(unitBox, [1, 0, 1], [0, 1, 0]);
    expect(e.width).toBeCloseTo(2 * Math.SQRT2);
    expect(e.height).toBeCloseTo(2);
  });

  it('sees the floor as a thin diamond when the camera is nearly level, and as a tall one from high up', () => {
    const low = viewExtent(unitBox, [1, 0.2, 1], [0, 1, 0]);
    const high = viewExtent(unitBox, [1, 1, 1], [0, 1, 0]);
    expect(high.height).toBeGreaterThan(low.height);
    expect(low.height).toBeGreaterThan(2 - 0.01);
  });

  it('reports where the middle of the box is when the camera looks off centre', () => {
    const e = viewExtent(unitBox, [0, 0, 1], [1, 1, 0]);
    // The camera looks along -z with right = +x, so a box centred left of the aim point is to the left (negative).
    expect(e.centerRight).toBeCloseTo(-1);
    expect(e.centerUp).toBeCloseTo(0);
  });

  it('gives right and up directions that are upright and at right angles', () => {
    const e = viewExtent(unitBox, [1, 0.5, 1], [0, 0, 0]);
    expect(e.right[1]).toBeCloseTo(0);
    expect(e.right[0] * e.up[0] + e.right[1] * e.up[1] + e.right[2] * e.up[2]).toBeCloseTo(0);
    expect(Math.hypot(...e.up)).toBeCloseTo(1);
  });

  it('copes with a degenerate direction without crashing', () => {
    expect(() => viewExtent(unitBox, [0, 0, 0], [0, 0, 0])).not.toThrow();
  });
});

describe('zoomToFit', () => {
  it('uses the tighter of the two fits', () => {
    expect(zoomToFit({ width: 10, height: 2 }, 100, 100, 1)).toBeCloseTo(10); // width decides
    expect(zoomToFit({ width: 2, height: 10 }, 100, 100, 1)).toBeCloseTo(10); // height decides
  });

  it('leaves a margin', () => {
    expect(zoomToFit({ width: 10, height: 5 }, 100, 100, 0.9)).toBeCloseTo(9);
  });

  it('makes the real office fit the window of the tower from the left', () => {
    const e = viewExtent(OFFICE.bounds, [1, 0.142, 0], OFFICE.center as unknown as [number, number, number]);
    const zoom = zoomToFit(e, 772, 350, 1);
    expect(e.width * zoom).toBeLessThanOrEqual(772.001);
    expect(e.height * zoom).toBeLessThanOrEqual(350.001);
  });

  it('sees the office from the arrival direction as a shape the same as the window, so it fills the window', () => {
    // Exactly side on, with the height the arrival uses: 0.2 of the corner view's height.
    const d = ARRIVAL_DIRECTION;
    const e = viewExtent(OFFICE.bounds, d, OFFICE.center as unknown as [number, number, number]);
    const windowAspect = 772 / 350;
    expect(e.width / e.height).toBeGreaterThan(windowAspect * 0.85);
    expect(e.width / e.height).toBeLessThan(windowAspect * 1.15);
    // And it is a flat section: the width is the depth of the floor plan, not its diagonal.
    expect(e.width).toBeCloseTo(OFFICE.bounds.maxZ - OFFICE.bounds.minZ, 0);
  });
});
