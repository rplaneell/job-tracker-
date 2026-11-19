import { beforeEach, describe, expect, it } from 'vitest';
import { useHq } from './useHq';

beforeEach(() => useHq.setState({ yaw: 0 }));

describe('office rotation state', () => {
  it('adds up turns in either direction without limit, so the office can go round more than once', () => {
    useHq.getState().rotateBy(Math.PI);
    useHq.getState().rotateBy(Math.PI);
    useHq.getState().rotateBy(Math.PI / 2);
    expect(useHq.getState().yaw).toBeCloseTo(2.5 * Math.PI);
    useHq.getState().rotateBy(-6 * Math.PI);
    expect(useHq.getState().yaw).toBeCloseTo(-3.5 * Math.PI);
  });
  it('ignores a turn that is not a real number', () => {
    useHq.getState().rotateBy(1);
    useHq.getState().rotateBy(Number.NaN);
    useHq.getState().rotateBy(Number.POSITIVE_INFINITY);
    expect(useHq.getState().yaw).toBe(1);
  });
  it('goes back to the starting view on reset', () => {
    useHq.getState().rotateBy(4);
    useHq.getState().resetView();
    expect(useHq.getState().yaw).toBe(0);
  });
});
