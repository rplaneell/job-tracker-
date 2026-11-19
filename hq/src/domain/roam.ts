import type { ScoutStatus } from './scouting';

/** How high the roof of the glass office is, in metres. Roof drops start from here. */
export const ROOF_Y = 2.6;

export type Move = 'walk' | 'pause' | 'hop' | 'flip' | 'drop';
type Stunt = 'hop' | 'flip' | 'drop';

export interface Behavior {
  /** False means the goblin stays where it is (Scouting failed: the crew stays slumped). */
  roam: boolean;
  /** Walking speed in metres per second. */
  speed: number;
  /** About how many seconds pass between stunts. */
  stuntEvery: number;
  stunts: Stunt[];
}

/** How lively the crew is follows the real Scouting status: calm when idle, a party when a review has just finished. */
const BEHAVIOR: Record<ScoutStatus, Behavior> = {
  idle: { roam: true, speed: 0.28, stuntEvery: 16, stunts: ['hop', 'flip'] },
  waiting: { roam: true, speed: 0.34, stuntEvery: 12, stunts: ['hop', 'flip'] },
  working: { roam: true, speed: 0.5, stuntEvery: 9, stunts: ['hop', 'flip', 'drop'] },
  completed: { roam: true, speed: 0.55, stuntEvery: 5, stunts: ['flip', 'drop', 'drop', 'hop'] },
  failed: { roam: false, speed: 0, stuntEvery: 0, stunts: [] },
};

export function behaviorFor(status: ScoutStatus): Behavior {
  return BEHAVIOR[status];
}

export interface Segment {
  move: Move;
  start: number;
  duration: number;
  from: { x: number; z: number };
  to: { x: number; z: number };
  /** Which way the goblin faces during this segment. */
  heading: number;
}

export interface Schedule {
  segments: Segment[];
  /** Seconds in one full loop. The route is closed, so the goblin ends where it began. */
  period: number;
}

export interface Frame {
  x: number;
  z: number;
  /** Height above the floor. */
  y: number;
  /** Which way the goblin faces, around the upright axis. */
  heading: number;
  /** How far it has turned over in a backflip, in radians. A whole number of turns means upright. */
  flip: number;
  /** 0 to 1: how squashed it is just after landing. */
  squash: number;
  move: Move;
  /** Seconds since this segment began, to line up the animation clip. */
  clipTime: number;
}

type Free = (x: number, z: number) => boolean;
/** Where a goblin may stop (and be seen) and where it may walk through. */
export interface Spaces {
  standable: Free;
  walkable: Free;
}

const STUNT_SECONDS: Record<Stunt, number> = { hop: 0.7, flip: 1.0, drop: 2.2 };
const LOOP_SECONDS = 70;

/** A small seeded random number generator, so the same seed always gives the same route. */
function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pathIsFree(a: { x: number; z: number }, b: { x: number; z: number }, free: Free): boolean {
  const steps = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.01));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    if (!free(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u)) return false;
  }
  return true;
}

function headingOf(a: { x: number; z: number }, b: { x: number; z: number }, fallback: number): number {
  return Math.hypot(b.x - a.x, b.z - a.z) < 1e-6 ? fallback : Math.atan2(b.x - a.x, b.z - a.z);
}

const CELL = 0.05;

/**
 * The shortest way round the furniture between two points, as a list of corner points. The room floor is a grid; the goblin
 * steps between free cells and the route is then pulled straight wherever it can see ahead. Null if there is no way.
 */
export function findPath(a: { x: number; z: number }, b: { x: number; z: number }, walkable: Free, box = ROOM): { x: number; z: number }[] | null {
  if (pathIsFree(a, b, walkable)) return [a, b];
  const nx = Math.floor((box.maxX - box.minX) / CELL) + 1;
  const nz = Math.floor((box.maxZ - box.minZ) / CELL) + 1;
  const at = (i: number, j: number) => ({ x: box.minX + i * CELL, z: box.minZ + j * CELL });
  const cell = (p: { x: number; z: number }): [number, number] => [Math.round((p.x - box.minX) / CELL), Math.round((p.z - box.minZ) / CELL)];
  const [si, sj] = cell(a);
  const [ei, ej] = cell(b);
  const free = new Map<number, boolean>();
  const ok = (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
    if ((i === si && j === sj) || (i === ei && j === ej)) return true;
    const k = j * nx + i;
    let v = free.get(k);
    if (v === undefined) {
      const p = at(i, j);
      v = walkable(p.x, p.z);
      free.set(k, v);
    }
    return v;
  };
  const from = new Map<number, number>();
  const queue: number[] = [sj * nx + si];
  from.set(sj * nx + si, -1);
  const goal = ej * nx + ei;
  for (let head = 0; head < queue.length && !from.has(goal); head++) {
    const k = queue[head];
    const i = k % nx;
    const j = Math.floor(k / nx);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const ni = i + di;
      const nj = j + dj;
      const nk = nj * nx + ni;
      if (from.has(nk) || !ok(ni, nj)) continue;
      if (di !== 0 && dj !== 0 && !(ok(i + di, j) && ok(i, j + dj))) continue; // no cutting corners
      from.set(nk, k);
      queue.push(nk);
    }
  }
  if (!from.has(goal)) return null;
  const cells: { x: number; z: number }[] = [];
  for (let k = goal; k !== -1; k = from.get(k) as number) cells.push(at(k % nx, Math.floor(k / nx)));
  cells.reverse();
  const raw = [a, ...cells.slice(1, -1), b];
  // Pull the route straight: from each corner, jump to the furthest later point that can be reached in a straight line.
  const out = [raw[0]];
  let i = 0;
  while (i < raw.length - 1) {
    let j = raw.length - 1;
    while (j > i + 1 && !pathIsFree(raw[i], raw[j], walkable)) j--;
    out.push(raw[j]);
    i = j;
  }
  return out;
}

/** A random place the goblin can stop at and a way to get there, or null. */
function nextTrip(from: { x: number; z: number }, spaces: Spaces, rand: () => number, box: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  for (let i = 0; i < 60; i++) {
    const p = { x: box.minX + rand() * (box.maxX - box.minX), z: box.minZ + rand() * (box.maxZ - box.minZ) };
    if (Math.hypot(p.x - from.x, p.z - from.z) < 0.6 || !spaces.standable(p.x, p.z)) continue;
    const route = findPath(from, p, spaces.walkable, box);
    if (route) return route;
  }
  return null;
}

const ROOM = { minX: -9.9, maxX: -6.45, minZ: 0.1, maxZ: 1.7 };

/** One closed tour round the room, starting and ending at the given spot. Deterministic for a seed. */
export function makeSchedule(seed: number, start: { x: number; z: number }, behavior: Behavior, spaces: Spaces): Schedule {
  if (!behavior.roam) {
    return { segments: [{ move: 'pause', start: 0, duration: LOOP_SECONDS, from: start, to: start, heading: 0 }], period: LOOP_SECONDS };
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const rand = rng(seed * 101 + attempt);
    const segments: Segment[] = [];
    let t = 0;
    let at = { ...start };
    let heading = 0;
    let sinceStunt = behavior.stuntEvery * (0.3 + rand() * 0.6); // goblins do not all start their stunts together
    const add = (move: Move, duration: number, to = at, face = heading) => {
      segments.push({ move, start: t, duration, from: at, to, heading: face });
      t += duration;
      at = to;
      heading = face;
    };
    const walkTo = (route: { x: number; z: number }[]) => {
      for (let k = 1; k < route.length; k++) {
        const d = Math.hypot(route[k].x - at.x, route[k].z - at.z);
        if (d < 1e-6) continue;
        add('walk', d / behavior.speed, route[k], headingOf(at, route[k], heading));
        sinceStunt += segments[segments.length - 1].duration;
      }
    };
    let ok = true;
    while (t < LOOP_SECONDS) {
      const route = nextTrip(at, spaces, rand, ROOM);
      if (!route) {
        ok = false;
        break;
      }
      walkTo(route);
      add('pause', 0.8 + rand() * 1.8);
      sinceStunt += segments[segments.length - 1].duration;
      if (sinceStunt >= behavior.stuntEvery * (0.7 + rand() * 0.6)) {
        const stunt = behavior.stunts[Math.floor(rand() * behavior.stunts.length)];
        add(stunt, STUNT_SECONDS[stunt]);
        add('pause', 0.5);
        sinceStunt = 0;
      }
    }
    const home = ok ? findPath(at, start, spaces.walkable) : null;
    if (!home) continue;
    walkTo(home);
    return { segments, period: t };
  }
  // No closed tour found for this seed: the goblin stays on its spot rather than walking through furniture.
  return { segments: [{ move: 'pause', start: 0, duration: LOOP_SECONDS, from: start, to: start, heading: 0 }], period: LOOP_SECONDS };
}

const smooth = (a: number, b: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** Where the goblin is, and how it is posed, at this many seconds into its loop. */
export function frameAt(schedule: Schedule, seconds: number): Frame {
  const t = ((seconds % schedule.period) + schedule.period) % schedule.period;
  let seg = schedule.segments[schedule.segments.length - 1];
  for (const s of schedule.segments) {
    if (t < s.start + s.duration) {
      seg = s;
      break;
    }
  }
  const local = t - seg.start;
  const u = Math.min(1, local / seg.duration);
  const base = { x: seg.from.x, z: seg.from.z, y: 0, heading: seg.heading, flip: 0, squash: 0, move: seg.move, clipTime: local };
  switch (seg.move) {
    case 'walk':
      return { ...base, x: seg.from.x + (seg.to.x - seg.from.x) * u, z: seg.from.z + (seg.to.z - seg.from.z) * u };
    case 'hop':
      return { ...base, y: 4 * 0.35 * u * (1 - u), squash: u > 0.9 ? (1 - u) * 5 : 0 };
    case 'flip':
      return { ...base, y: 4 * 0.7 * u * (1 - u), flip: 2 * Math.PI * smooth(0.1, 0.9, u), squash: u > 0.92 ? (1 - u) * 6 : 0 };
    case 'drop':
      // Up to the roof, then down again in a backflip.
      return { ...base, y: ROOF_Y * 4 * u * (1 - u), flip: 2 * Math.PI * smooth(0.45, 0.92, u), squash: u > 0.94 ? (1 - u) * 8 : 0 };
    default:
      return base;
  }
}
