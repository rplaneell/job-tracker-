/**
 * The opening animation: a drone climbs the glass tower floor by floor until it reaches the office window, stops at the lit office floor,
 * flies in through the glass, and the office builds itself, all in 3 seconds.
 * This file holds only the timing maths, so it can be tested without a screen. Times are in milliseconds.
 */

/** The whole animation. It ends exactly on the normal overview of the office. */
export const INTRO_MS = 3000;
/** People who ask their system for less motion get a short fade instead of the climb and the camera move. */
export const REDUCED_MS = 500;
/** When the soft floor shadows are drawn, once, after every part and character is in place. */
export const SHADOWS_AT_MS = 2850;
/** When the header and the buttons start to fade in. */
export const CHROME_AT_MS = 2600;
/** The speech bubbles stay hidden until this long after the animation ends, so the last frame is the clean office. */
export const LABEL_DELAY_MS = 900;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 before `from`, 1 after `to`, and a straight ramp in between. */
export function span(ms: number, from: number, to: number): number {
  return clamp01((ms - from) / (to - from));
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Overshoots a little past 1 and settles back: the small bounce. */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function introDuration(reduced: boolean): number {
  return reduced ? REDUCED_MS : INTRO_MS;
}

/** The drone climbs from the street up to the office floor between these two moments. */
export const CLIMB_FROM_MS = 150;
export const CLIMB_TO_MS = 1650;

/** What the screen overlay and the camera should do at one moment. */
export interface IntroFrame {
  /** True while the animation still has work to do. */
  active: boolean;
  /** How far up the tower the drone is. 0 is the street, 1 is the office floor. It speeds up, then slows to a stop. */
  climb: number;
  /** How fast the drone is going, from 0 (still) to 1 (fastest). It drives the streaking of the windows. */
  speed: number;
  /** How far the drone looks up, in degrees. Steep at the street, level at the office floor. */
  tilt: number;
  /** A small roll of the drone as it flies, in degrees. */
  roll: number;
  /** A small sideways drift, in percent of the screen width. */
  drift: number;
  /** Warm light from the office floor as the drone arrives and hovers at the glass, 0 to 1. */
  glow: number;
  /** Bright flash as the drone flies in, 0 to 1. */
  flash: number;
  /** How much the tower has grown, so it feels like the camera passes through the glass. */
  wallScale: number;
  /** 1 while the tower is solid, 0 once it is gone. */
  wallOpacity: number;
  /** Full screen cover used by the reduced motion fade. 1 is covered, 0 is clear. */
  veil: number;
  /** Camera zoom, as a multiple of the normal zoom. */
  zoomFactor: number;
  /** How far the camera is still from the overview, towards the entrance. 1 is at the entrance, 0 is at the overview. */
  slide: number;
  /** Camera height, as a multiple of the normal isometric height. Below 1 looks more level, and it rises to 1. */
  elevation: number;
}

/** How fast the drone is going at a moment, from 0 to 1: the slope of the climb curve, scaled so its fastest point is 1. */
export function climbSpeedAt(ms: number): number {
  const t = span(ms, CLIMB_FROM_MS, CLIMB_TO_MS);
  if (t <= 0 || t >= 1) return 0;
  return t < 0.5 ? 4 * t * t : 4 * (1 - t) * (1 - t);
}

export function introFrame(ms: number, reduced: boolean): IntroFrame {
  if (reduced) {
    return { active: ms < REDUCED_MS, climb: 1, speed: 0, tilt: 0, roll: 0, drift: 0, glow: 0, flash: 0, wallScale: 1, wallOpacity: 0, veil: 1 - span(ms, 0, REDUCED_MS), zoomFactor: 1, slide: 0, elevation: 1 };
  }
  const climb = easeInOutCubic(span(ms, CLIMB_FROM_MS, CLIMB_TO_MS));
  const speed = climbSpeedAt(ms);
  // Once the drone is through the glass the camera pulls back from the entrance to the overview.
  const eased = easeInOutCubic(span(ms, 1700, 2800));
  const flashUp = span(ms, 1800, 2000);
  const flashDown = 1 - span(ms, 2000, 2400);
  const calm = 1 - span(ms, CLIMB_TO_MS, 2100);
  return {
    active: ms < INTRO_MS,
    climb,
    speed,
    tilt: 34 * (1 - climb),
    // The drone rocks a little as it climbs, a bit more when it is going fast, and settles as it hovers at the glass.
    roll: Math.sin(ms * 0.0125) * (0.25 + 0.9 * speed) * calm,
    drift: Math.sin(ms * 0.0071 + 1) * (0.25 + 0.5 * speed) * calm,
    glow: span(ms, 1250, 1650) * (1 - span(ms, 1900, 2300)),
    flash: 0.85 * Math.min(flashUp, flashDown),
    // The push in starts before the climb has finished, so the drone never stops: one movement flows into the next.
    wallScale: lerp(1, 4.2, span(ms, 1250, 2350) ** 2),
    wallOpacity: 1 - span(ms, 1750, 2300),
    veil: 0,
    zoomFactor: lerp(2.4, 1, eased),
    slide: 1 - eased,
    elevation: lerp(0.5, 1, eased),
  };
}

/** Parts of the office build themselves in these groups, one after another. */
export type Wave = 'floor' | 'walls' | 'desks' | 'seating' | 'tech' | 'small';

/** When each group starts, and how far (in metres) it travels. Negative starts below its place, positive starts above. */
export const WAVES: Record<Wave, { start: number; from: number }> = {
  floor: { start: 1700, from: -0.9 },
  walls: { start: 1790, from: -3 },
  desks: { start: 1880, from: 1.8 },
  seating: { start: 1970, from: 1.8 },
  tech: { start: 2060, from: 1.8 },
  small: { start: 2150, from: 1.8 },
};
/** How long one group takes to land. */
export const WAVE_MS = 450;
/** How long a character takes to pop in. */
export const POP_MS = 350;
/** When each character starts to pop in. Goblins add a little per goblin. */
export const POP_START = { manager: 2150, cv: 2200, linkedin: 2250, goblins: 2300, goblinStep: 50 };

const BY_MATERIAL: Record<string, Wave> = {
  'floor.001': 'floor',
  floor: 'floor',
  Wall_material: 'walls',
  Baseboard_material: 'walls',
  Glass: 'walls',
  wood: 'desks',
  wood_4: 'desks',
  'wood.002': 'desks',
  'wood.004': 'desks',
  'wood.005': 'desks',
  Pam_desk: 'desks',
  Metal: 'desks',
  Grey_shelfes: 'desks',
  OfficeChair_Modern: 'seating',
  Office_Chair: 'seating',
  '01_-_Default': 'seating',
  Black_plastic: 'tech',
  Monitor_01: 'tech',
  Monitor_01_Decals: 'tech',
  Monitor_screen: 'tech',
  'Monitor.002': 'tech',
  printer_Buttons_Black: 'tech',
  printer_Button_ONOFF: 'tech',
  printer_Grey: 'tech',
  Projector: 'tech',
  Material_27: 'tech',
};

/** Which group a part of the office belongs to, from the name of its material. Anything unknown counts as a small thing. */
export function waveOf(material: string): Wave {
  return BY_MATERIAL[material] ?? 'small';
}

export interface Reveal {
  visible: boolean;
  /** Height above (or below) its final place, in metres. */
  lift: number;
}

export function revealLift(ms: number, wave: Wave, reduced: boolean): Reveal {
  if (reduced) return { visible: true, lift: 0 };
  const { start, from } = WAVES[wave];
  if (ms < start) return { visible: false, lift: from };
  const t = span(ms, start, start + WAVE_MS);
  return { visible: true, lift: t >= 1 ? 0 : from * (1 - easeOutBack(t)) };
}

/** Size of a character from 0 (not there yet) to 1 (arrived), with a little overshoot. */
export function popScale(ms: number, start: number, reduced: boolean): number {
  if (reduced) return 1;
  if (ms < start) return 0;
  const t = span(ms, start, start + POP_MS);
  return t >= 1 ? 1 : Math.max(0.001, easeOutBack(t));
}

/**
 * The animation plays once per browser session, so coming back to the office from another page does not replay it.
 * `?intro=0` always turns it off and `?intro=1` always plays it. A link straight into a department (`?focus=`) skips it.
 */
export function introEnabledFromSearch(search: string, seenThisSession = false): boolean {
  const params = new URLSearchParams(search);
  const asked = params.get('intro');
  if (asked === '0') return false;
  if (asked === '1') return true;
  return !seenThisSession && !params.has('focus');
}

export type IntroState = 'off' | 'waiting' | 'playing' | 'done';

/**
 * Keeps the time. It waits until the office has loaded, then counts from that moment, so a slow download never cuts the
 * animation short. `now` is passed in so tests do not need a real clock.
 */
export interface IntroClock {
  readonly enabled: boolean;
  readonly reduced: boolean;
  readonly duration: number;
  /** Starts the count. Calling it again does nothing. */
  begin: (now: number) => void;
  /** Jumps to the end. */
  skip: () => void;
  /** Milliseconds since the start: 0 while waiting for the office to load, and the full duration once finished or turned off. */
  ms: (now: number) => number;
  state: (now: number) => IntroState;
}

export function createIntroClock(opts: { enabled: boolean; reduced: boolean }): IntroClock {
  const duration = introDuration(opts.reduced);
  let startedAt: number | null = null;
  let skipped = false;
  const ms = (now: number): number => {
    if (!opts.enabled || skipped) return duration;
    if (startedAt === null) return 0;
    return Math.min(duration, Math.max(0, now - startedAt));
  };
  return {
    enabled: opts.enabled,
    reduced: opts.reduced,
    duration,
    begin: (now) => {
      if (startedAt === null) startedAt = now;
    },
    skip: () => {
      skipped = true;
    },
    ms,
    state: (now) => (!opts.enabled ? 'off' : skipped ? 'done' : startedAt === null ? 'waiting' : ms(now) >= duration ? 'done' : 'playing'),
  };
}
