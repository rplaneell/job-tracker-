import { describe, expect, it } from 'vitest';
import { KEY_STEP, rotateDirection, yawFromDrag } from './rotation';

const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);
const BASE: [number, number, number] = [1, 1.2, 1];

describe('rotateDirection', () => {
  it('leaves the direction alone at no rotation', () => {
    expect(rotateDirection(BASE, 0)).toEqual(BASE);
  });
  it('comes back to the start after a full turn, and after four quarter turns', () => {
    const full = rotateDirection(BASE, 2 * Math.PI);
    BASE.forEach((v, i) => close(full[i], v));
    let d = BASE;
    for (let i = 0; i < 4; i++) d = rotateDirection(d, Math.PI / 2);
    BASE.forEach((v, i) => close(d[i], v));
  });
  it('looks from the opposite side at half a turn, at the same height', () => {
    const [x, y, z] = rotateDirection(BASE, Math.PI);
    close(x, -1); close(y, 1.2); close(z, -1);
  });
  it('keeps the height and the sideways length at every angle, so the view stays isometric', () => {
    for (let deg = -720; deg <= 720; deg += 13) {
      const [x, y, z] = rotateDirection(BASE, (deg * Math.PI) / 180);
      close(y, BASE[1]);
      close(Math.hypot(x, z), Math.hypot(BASE[0], BASE[2]));
    }
  });
});

describe('yawFromDrag', () => {
  it('turns the office with the pointer: dragging right turns it one way, left the other, the same amount', () => {
    expect(yawFromDrag(100)).toBeGreaterThan(0);
    close(yawFromDrag(-100), -yawFromDrag(100));
    expect(yawFromDrag(0)).toBe(0);
  });
  it('lets one drag across a normal screen turn the office a full circle', () => {
    expect(Math.abs(yawFromDrag(900))).toBeGreaterThan(Math.PI * 1.5);
  });
});

describe('KEY_STEP', () => {
  it('is a small step, so 24 presses make a full circle', () => {
    close(KEY_STEP * 24, 2 * Math.PI);
  });
});
