import { describe, expect, it } from 'vitest';
import {
  CHROME_AT_MS,
  CLIMB_FROM_MS,
  CLIMB_TO_MS,
  INTRO_MS,
  LABEL_DELAY_MS,
  POP_MS,
  POP_START,
  REDUCED_MS,
  SHADOWS_AT_MS,
  WAVES,
  WAVE_MS,
  climbSpeedAt,
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

/** The moment the tower is fully gone, found by scanning the frames. */
function introFrameFadeEnd(): number {
  for (let ms = 0; ms <= INTRO_MS; ms += 10) if (introFrame(ms, false).wallOpacity === 0) return ms;
  return INTRO_MS;
}

const LAST_POP_END = POP_START.goblins + 3 * POP_START.goblinStep + POP_MS;

describe('the opening animation timing', () => {
  it('lasts exactly 3 seconds, and the reduced version is shorter', () => {
    expect(INTRO_MS).toBe(3000);
    expect(introDuration(false)).toBe(3000);
    expect(introDuration(true)).toBe(REDUCED_MS);
    expect(REDUCED_MS).toBeLessThan(INTRO_MS);
  });

  it('draws the floor shadows once, after the last character has landed and before the end', () => {
    expect(SHADOWS_AT_MS).toBeGreaterThanOrEqual(LAST_POP_END);
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
  it('starts at the street, looking steeply up, with a solid tower and the camera at the entrance', () => {
    const f = introFrame(0, false);
    expect(f.active).toBe(true);
    expect(f.climb).toBe(0);
    expect(f.speed).toBe(0);
    expect(f.tilt).toBeCloseTo(34);
    expect(f.glow).toBe(0);
    expect(f.wallOpacity).toBe(1);
    expect(f.wallScale).toBe(1);
    expect(f.zoomFactor).toBeCloseTo(2.4);
    expect(f.slide).toBe(1);
    expect(f.elevation).toBeCloseTo(0.5);
  });

  it('climbs steadily and never goes back down', () => {
    let last = -1;
    for (let ms = 0; ms <= INTRO_MS; ms += 10) {
      const c = introFrame(ms, false).climb;
      expect(c).toBeGreaterThanOrEqual(last);
      last = c;
    }
    expect(introFrame(CLIMB_TO_MS, false).climb).toBe(1);
  });

  it('is fastest in the middle of the climb and still at both ends', () => {
    expect(climbSpeedAt(CLIMB_FROM_MS - 50)).toBe(0);
    expect(climbSpeedAt(CLIMB_TO_MS + 50)).toBe(0);
    const middle = (CLIMB_FROM_MS + CLIMB_TO_MS) / 2;
    expect(climbSpeedAt(middle)).toBeCloseTo(1, 6);
    expect(climbSpeedAt(CLIMB_FROM_MS + 100)).toBeLessThan(climbSpeedAt(middle));
    expect(introFrame(middle, false).speed).toBeCloseTo(1, 6);
  });

  it('looks up steeply at the street and levels out at the office floor', () => {
    expect(introFrame(CLIMB_FROM_MS, false).tilt).toBeCloseTo(34);
    expect(introFrame(CLIMB_TO_MS, false).tilt).toBe(0);
    let last = Infinity;
    for (let ms = 0; ms <= INTRO_MS; ms += 10) {
      const t = introFrame(ms, false).tilt;
      expect(t).toBeLessThanOrEqual(last);
      last = t;
    }
  });

  it('rocks a little in flight and hovers steadily once it has arrived', () => {
    const rolls = Array.from({ length: 60 }, (_, i) => introFrame(CLIMB_FROM_MS + i * 20, false).roll);
    expect(Math.max(...rolls.map(Math.abs))).toBeGreaterThan(0.2);
    expect(Math.max(...rolls.map(Math.abs))).toBeLessThan(1.5);
    expect(introFrame(2150, false).roll).toBeCloseTo(0, 10);
    expect(introFrame(2150, false).drift).toBeCloseTo(0, 10);
  });

  it('warms the glass with light as the drone arrives, then lets it go as the tower fades', () => {
    expect(introFrame(1200, false).glow).toBe(0);
    expect(introFrame(CLIMB_TO_MS, false).glow).toBeGreaterThan(0.9);
    expect(introFrame(2300, false).glow).toBe(0);
  });

  it('never stops: the push in starts before the climb ends, and something is always moving', () => {
    expect(introFrame(CLIMB_TO_MS - 200, false).wallScale).toBeGreaterThan(1);
    for (let ms = 200; ms < 2700; ms += 10) {
      const a = introFrame(ms, false);
      const b = introFrame(ms + 10, false);
      const moved = Math.abs(b.climb - a.climb) + Math.abs(b.wallScale - a.wallScale) + Math.abs(b.zoomFactor - a.zoomFactor) + Math.abs(b.wallOpacity - a.wallOpacity);
      expect(moved, `still at ${ms} ms`).toBeGreaterThan(0);
    }
  });

  it('grows the tower smoothly, never jumping from one frame to the next', () => {
    let last = introFrame(0, false).wallScale;
    for (let ms = 10; ms <= INTRO_MS; ms += 10) {
      const now = introFrame(ms, false).wallScale;
      expect(now - last).toBeLessThan(0.12);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it('flashes as the drone flies in', () => {
    expect(introFrame(1750, false).flash).toBe(0);
    expect(introFrame(2000, false).flash).toBeGreaterThan(0.5);
    expect(introFrame(2450, false).flash).toBe(0);
  });

  it('removes the tower by the time the office is built', () => {
    expect(introFrame(2300, false).wallOpacity).toBe(0);
    expect(introFrame(2350, false).wallScale).toBeCloseTo(4.2);
  });

  it('pulls the camera back and ends on the normal overview exactly', () => {
    const end = introFrame(INTRO_MS, false);
    expect(end.active).toBe(false);
    expect(end.zoomFactor).toBe(1);
    expect(end.slide).toBe(0);
    expect(end.elevation).toBe(1);
    const settled = introFrame(2800, false);
    expect(settled.zoomFactor).toBe(1);
    expect(settled.slide).toBe(0);
    let last = Infinity;
    for (let ms = 0; ms <= INTRO_MS; ms += 20) {
      const z = introFrame(ms, false).zoomFactor;
      expect(z).toBeLessThanOrEqual(last);
      last = z;
    }
  });

  it('reduced motion has no climb and no camera move, only a short fade', () => {
    const start = introFrame(0, true);
    expect(start.veil).toBe(1);
    expect(start.speed).toBe(0);
    expect(start.tilt).toBe(0);
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

  it('starts building as the drone arrives at the glass, before the tower has faded', () => {
    expect(WAVES.floor.start).toBeGreaterThanOrEqual(CLIMB_TO_MS);
    expect(WAVES.floor.start).toBeLessThan(introFrameFadeEnd());
  });

  it('is complete when the camera settles', () => {
    expect(WAVES.small.start + WAVE_MS).toBeLessThanOrEqual(2800);
    expect(LAST_POP_END).toBeLessThanOrEqual(2850);
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

  it('plays once per session: not again after it has been seen, unless intro=1 asks for it', () => {
    expect(introEnabledFromSearch('', true)).toBe(false);
    expect(introEnabledFromSearch('?corner=1', true)).toBe(false);
    expect(introEnabledFromSearch('?intro=1', true)).toBe(true);
    expect(introEnabledFromSearch('?intro=0', false)).toBe(false);
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
