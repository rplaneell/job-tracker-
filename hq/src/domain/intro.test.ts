import { describe, expect, it } from 'vitest';
import {
  CHROME_AT_MS,
  INTRO_MS,
  LABEL_DELAY_MS,
  POP_MS,
  POP_START,
  REDUCED_MS,
  SHADOWS_AT_MS,
  WAVES,
  WAVE_MS,
  createIntroClock,
  easeInOutCubic,
  easeOutBack,
  introDuration,
  introEnabledFromSearch,
  introFrame,
  popScale,
  revealLift,
  span,
  waveOf,
} from './intro';

describe('the opening animation timing', () => {
  it('lasts exactly 3 seconds, and the reduced version is shorter', () => {
    expect(INTRO_MS).toBe(3000);
    expect(introDuration(false)).toBe(3000);
    expect(introDuration(true)).toBe(REDUCED_MS);
    expect(REDUCED_MS).toBeLessThan(INTRO_MS);
  });

  it('draws the floor shadows once, after the last character has landed and before the end', () => {
    expect(SHADOWS_AT_MS).toBeGreaterThanOrEqual(POP_START.goblins + 3 * POP_START.goblinStep + POP_MS);
    expect(SHADOWS_AT_MS).toBeLessThan(INTRO_MS);
  });

  it('shows the interface and the labels only after the office has appeared', () => {
    expect(CHROME_AT_MS).toBeGreaterThan(WAVES.small.start + WAVE_MS - 1);
    expect(CHROME_AT_MS).toBeLessThan(INTRO_MS);
    expect(LABEL_DELAY_MS).toBeGreaterThan(0);
  });

  it('ramps and clamps', () => {
    expect(span(0, 100, 200)).toBe(0);
    expect(span(150, 100, 200)).toBe(0.5);
    expect(span(500, 100, 200)).toBe(1);
  });

  it('eases start and finish at the right values', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
    expect(easeOutBack(0)).toBeCloseTo(0, 6);
    expect(easeOutBack(1)).toBeCloseTo(1, 6);
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1);
  });
});

describe('introFrame', () => {
  it('starts with a closed door, a close camera at the entrance and a solid wall', () => {
    const f = introFrame(0, false);
    expect(f.active).toBe(true);
    expect(f.doorAngle).toBe(0);
    expect(f.glow).toBe(0);
    expect(f.wallOpacity).toBe(1);
    expect(f.wallScale).toBe(1);
    expect(f.zoomFactor).toBeCloseTo(2.4);
    expect(f.slide).toBe(1);
    expect(f.elevation).toBeCloseTo(0.5);
  });

  it('lights up behind the door before it opens', () => {
    expect(introFrame(500, false).glow).toBeGreaterThan(0);
    expect(introFrame(500, false).doorAngle).toBe(0);
    expect(introFrame(699, false).glow).toBeGreaterThan(0.9);
  });

  it('swings the door open and flashes while it does', () => {
    expect(introFrame(1000, false).doorAngle).toBeGreaterThan(0);
    expect(introFrame(1000, false).flash).toBeGreaterThan(0.5);
    expect(introFrame(1300, false).doorAngle).toBeCloseTo(82);
    expect(introFrame(1700, false).flash).toBe(0);
  });

  it('opens the door steadily, never going backwards', () => {
    let last = -1;
    for (let ms = 0; ms <= INTRO_MS; ms += 20) {
      const angle = introFrame(ms, false).doorAngle;
      expect(angle).toBeGreaterThanOrEqual(last);
      last = angle;
    }
  });

  it('removes the wall by the time the office is built', () => {
    expect(introFrame(1950, false).wallOpacity).toBe(0);
    expect(introFrame(2000, false).wallScale).toBeCloseTo(3.4);
  });

  it('pulls the camera back and ends on the normal overview exactly', () => {
    const end = introFrame(INTRO_MS, false);
    expect(end.active).toBe(false);
    expect(end.zoomFactor).toBe(1);
    expect(end.slide).toBe(0);
    expect(end.elevation).toBe(1);
    const settled = introFrame(2700, false);
    expect(settled.zoomFactor).toBe(1);
    expect(settled.slide).toBe(0);
  });

  it('pulls the camera back smoothly, never going backwards', () => {
    let last = Infinity;
    for (let ms = 0; ms <= INTRO_MS; ms += 20) {
      const z = introFrame(ms, false).zoomFactor;
      expect(z).toBeLessThanOrEqual(last);
      last = z;
    }
  });

  it('reduced motion has no door and no camera move, only a short fade', () => {
    const start = introFrame(0, true);
    expect(start.veil).toBe(1);
    expect(start.doorAngle).toBe(0);
    expect(start.wallOpacity).toBe(0);
    expect(start.zoomFactor).toBe(1);
    expect(start.slide).toBe(0);
    expect(start.elevation).toBe(1);
    expect(introFrame(REDUCED_MS / 2, true).veil).toBeCloseTo(0.5);
    const end = introFrame(REDUCED_MS, true);
    expect(end.active).toBe(false);
    expect(end.veil).toBe(0);
  });
});

describe('the office building itself', () => {
  it('puts every kind of part in a group, and unknown ones count as small things', () => {
    expect(waveOf('floor.001')).toBe('floor');
    expect(waveOf('Wall_material')).toBe('walls');
    expect(waveOf('Pam_desk')).toBe('desks');
    expect(waveOf('OfficeChair_Modern')).toBe('seating');
    expect(waveOf('Monitor_01')).toBe('tech');
    expect(waveOf('Fronds')).toBe('small');
    expect(waveOf('something new')).toBe('small');
  });

  it('builds in order: floor, walls, desks, seats, screens, small things', () => {
    const order = [WAVES.floor, WAVES.walls, WAVES.desks, WAVES.seating, WAVES.tech, WAVES.small].map((w) => w.start);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('is complete before the camera settles', () => {
    expect(WAVES.small.start + WAVE_MS).toBeLessThanOrEqual(2700);
    expect(POP_START.goblins + 3 * POP_START.goblinStep + POP_MS).toBeLessThanOrEqual(2700);
  });

  it('hides a group before its turn, then lands it in place', () => {
    const before = revealLift(WAVES.desks.start - 1, 'desks', false);
    expect(before.visible).toBe(false);
    const mid = revealLift(WAVES.desks.start + 100, 'desks', false);
    expect(mid.visible).toBe(true);
    expect(mid.lift).toBeGreaterThan(0);
    const done = revealLift(WAVES.desks.start + WAVE_MS, 'desks', false);
    expect(done).toEqual({ visible: true, lift: 0 });
  });

  it('lifts walls and floor up from below, and everything else drops from above', () => {
    expect(revealLift(WAVES.walls.start + 50, 'walls', false).lift).toBeLessThan(0);
    expect(revealLift(WAVES.floor.start + 50, 'floor', false).lift).toBeLessThan(0);
    expect(revealLift(WAVES.tech.start + 50, 'tech', false).lift).toBeGreaterThan(0);
  });

  it('shows everything in place straight away with reduced motion', () => {
    expect(revealLift(0, 'walls', true)).toEqual({ visible: true, lift: 0 });
  });

  it('pops characters in from nothing with a little bounce', () => {
    expect(popScale(0, POP_START.manager, false)).toBe(0);
    expect(popScale(POP_START.manager + 100, POP_START.manager, false)).toBeGreaterThan(0);
    expect(popScale(POP_START.manager + POP_MS, POP_START.manager, false)).toBe(1);
    expect(popScale(0, POP_START.manager, true)).toBe(1);
    const sizes = Array.from({ length: 40 }, (_, i) => popScale(POP_START.manager + i * 10, POP_START.manager, false));
    expect(Math.max(...sizes)).toBeGreaterThan(1);
  });
});

describe('when the animation plays', () => {
  it('plays by default and turns off with intro=0', () => {
    expect(introEnabledFromSearch('')).toBe(true);
    expect(introEnabledFromSearch('?corner=2')).toBe(true);
    expect(introEnabledFromSearch('?intro=0')).toBe(false);
  });

  it('skips for a link straight into a department, unless intro=1 asks for it', () => {
    expect(introEnabledFromSearch('?focus=cv')).toBe(false);
    expect(introEnabledFromSearch('?focus=cv&intro=1')).toBe(true);
  });
});

describe('the intro clock', () => {
  it('waits for the office to load and counts from that moment', () => {
    const c = createIntroClock({ enabled: true, reduced: false });
    expect(c.state(5000)).toBe('waiting');
    expect(c.ms(5000)).toBe(0);
    c.begin(6000);
    expect(c.state(6000)).toBe('playing');
    expect(c.ms(6500)).toBe(500);
    c.begin(9000); // a second call changes nothing
    expect(c.ms(6500)).toBe(500);
    expect(c.ms(6000 + INTRO_MS + 400)).toBe(INTRO_MS);
    expect(c.state(6000 + INTRO_MS)).toBe('done');
  });

  it('never runs backwards', () => {
    const c = createIntroClock({ enabled: true, reduced: false });
    c.begin(1000);
    expect(c.ms(900)).toBe(0);
  });

  it('can be skipped, even before the office has loaded', () => {
    const c = createIntroClock({ enabled: true, reduced: false });
    c.skip();
    expect(c.state(0)).toBe('done');
    expect(c.ms(0)).toBe(INTRO_MS);
  });

  it('is already finished when turned off', () => {
    const c = createIntroClock({ enabled: false, reduced: false });
    expect(c.state(0)).toBe('off');
    expect(c.ms(0)).toBe(INTRO_MS);
    expect(c.enabled).toBe(false);
  });

  it('uses the short length for reduced motion', () => {
    const c = createIntroClock({ enabled: true, reduced: true });
    expect(c.duration).toBe(REDUCED_MS);
    c.begin(0);
    expect(c.ms(10000)).toBe(REDUCED_MS);
    expect(c.reduced).toBe(true);
  });
});
