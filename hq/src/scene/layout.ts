/** Where things are in the office model. Measured from the model file, in metres. */
export const OFFICE = {
  /** Middle of the floor plan. */
  center: [-5.04, 0.6, 5] as const,
  /** The box the office fills, in metres: the whole floor plan and the height of its walls. Used to fit the opening animation to it. */
  bounds: { minX: -10.1, maxX: 0.1, minZ: -0.1, maxZ: 10.1, height: 3.2 },
  /** Curved reception desk (the part named Reception_4 in the model). */
  desk: { center: [-0.93, 0.45, 4.88] as const },
};

/** Camera looks along this direction. Four choices, one per corner, so the open side can be picked. */
export const CORNERS: Record<number, [number, number, number]> = {
  0: [1, 1, 1],
  1: [-1, 1, 1],
  2: [-1, 1, -1],
  3: [1, 1, -1],
};

export const CAMERA = {
  /** Classic isometric elevation: the direction is (1, 1, 1) normalised, so the height is 1 over the ground length. */
  distance: 40,
  /** How much closer the department view is than the overview. */
  focusFactor: 2.1,
  /** The glass office is a small room, so Scouting zooms in closer. */
  scoutFocusFactor: 3.2,
  /** The CV Tailor stands in the open, so a medium zoom keeps the desks around it in view. */
  cvFocusFactor: 2.8,
  /** The LinkedIn desk is a small table in the open, so it zooms like the CV Tailor. */
  linkedinFocusFactor: 3,
  /** Width of the side panel in pixels, so the focused desk can sit beside it. */
  panelPx: 400,
};

/** Pixels per metre that fit the whole building in the window with room for the interface. Roughly 18 m wide, 13 m tall. */
export function fitZoom(width: number, height: number): number {
  return Math.max(14, Math.min(width / 18, height / 13));
}

/** Goblins are small: about 0.4 m wide, so 0.2 m either side of the spot must be free. */
export const GOBLIN_RADIUS = 0.2;

interface Box2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * The glass office at the far corner of the building: a desk, a chair and two armchairs. Measured from a plan view of
 * the office model at 100 pixels per metre (x from -10 to 0, z from 0 to 10), the same way as the reception desk.
 */
export const GLASS_OFFICE = {
  /** Where the camera looks when Scouting is open. */
  center: [-8.2, 0.6, 0.9] as const,
  box: { minX: -9.9, maxX: -6.45, minZ: 0.1, maxZ: 1.7 } satisfies Box2,
  obstacles: [
    { name: 'desk', minX: -9.35, maxX: -7.8, minZ: 0.4, maxZ: 1.05 },
    { name: 'desk chair', minX: -8.65, maxX: -8.05, minZ: -0.05, maxZ: 0.55 },
    { name: 'armchairs', minX: -7.2, maxX: -6.6, minZ: 0.15, maxZ: 1.45 },
  ] satisfies (Box2 & { name: string })[],
  /**
   * One standing spot per goblin, and which way it faces (rotation around the vertical axis). The solid door in the south
   * wall hides the floor diagonally behind it from the default camera, so spots stay out of that blind zone.
   */
  spots: [
    { x: -9.65, z: 1.0, rotationY: Math.PI / 2 },
    { x: -7.5, z: 0.75, rotationY: Math.PI / 4 },
    { x: -9.1, z: 1.45, rotationY: Math.PI },
    { x: -7.5, z: 1.35, rotationY: Math.PI / 4 },
  ],
};

/**
 * Where the CV Tailor stands: in the aisle between the two desk islands in the middle of the open office, where the floor is
 * free and the default camera sees it. Boxes were measured from the plan view of the office model, like the other places.
 */
export const CV_STATION = {
  /** Where the camera looks when the CV panel is open. */
  center: [-6.0, 0.9, 4.2] as const,
  spot: { x: -6.0, z: 4.2, rotationY: Math.PI / 4 },
  radius: 0.3,
  obstacles: [
    { name: 'west desk island', minX: -7.95, maxX: -6.5, minZ: 2.85, maxZ: 5.0 },
    { name: 'east desk island', minX: -5.0, maxX: -3.5, minZ: 2.85, maxZ: 5.0 },
    { name: 'east island chair', minX: -5.65, maxX: -4.95, minZ: 2.95, maxZ: 3.65 },
  ] satisfies { name: string; minX: number; maxX: number; minZ: number; maxZ: number }[],
};

/**
 * The LinkedIn desk: a table with LinkedIn merchandise and the person who runs it, on the open floor just north of the meeting
 * room, well away from the glass Scouting room. Boxes were measured from a plan view of the office model, like the other places.
 */
export const LINKEDIN_STATION = {
  /** Where the camera looks when the LinkedIn panel is open. */
  center: [-8.7, 0.9, 5.6] as const,
  /** Where the person stands: behind the table, facing the camera. */
  spot: { x: -9.15, z: 5.1, rotationY: Math.PI / 4 },
  radius: 0.3,
  /** The merchandise table, in metres. */
  table: { minX: -9.25, maxX: -7.95, minZ: 5.5, maxZ: 6.2, height: 0.76 },
  obstacles: [
    { name: 'west desk island', minX: -7.95, maxX: -6.5, minZ: 2.85, maxZ: 5.0 },
    { name: 'left wall bench', minX: -10.0, maxX: -9.75, minZ: 4.7, maxZ: 5.8 },
    { name: 'meeting room glass wall', minX: -10.0, maxX: -2.7, minZ: 6.85, maxZ: 7.0 },
  ] satisfies { name: string; minX: number; maxX: number; minZ: number; maxZ: number }[],
};

/** The realistic goblin is about 0.5 m tall and 0.3 m across at the feet, so it needs 0.15 m either side of where it stands. */
export const ROAM_RADIUS = 0.15;

/**
 * Is the floor point hidden behind the solid door from the default camera? The camera looks along (-1, -1) in the floor plane, so
 * x minus z stays the same along a line of sight. The door spans x -8.45 to -7.55 in the south wall at z 1.75, so it hides lines
 * with x - z between -10.2 and -9.3.
 */
export function inDoorBlindZone(x: number, z: number, radius: number = ROAM_RADIUS): boolean {
  const line = x - z;
  const lo = -10.2 - radius * Math.SQRT2;
  const hi = -9.3 + radius * Math.SQRT2;
  return !(line < lo || line > hi || z > 1.75);
}

/** Can a goblin walk through here: inside its glass office and clear of the furniture? It may pass behind the solid door. */
export function isWalkableForGoblin(x: number, z: number, radius: number = ROAM_RADIUS): boolean {
  const b = GLASS_OFFICE.box;
  if (x < b.minX + radius || x > b.maxX - radius || z < b.minZ + radius || z > b.maxZ - radius) return false;
  for (const o of GLASS_OFFICE.obstacles) {
    // Touching the edge of the clearance box is allowed; only going inside it is not (the 1 micrometre absorbs rounding).
    if (x > o.minX - radius + 1e-6 && x < o.maxX + radius - 1e-6 && z > o.minZ - radius + 1e-6 && z < o.maxZ + radius - 1e-6) return false;
  }
  return true;
}

/** Can a goblin stop and perform here: walkable, and where the camera can see it (not behind the solid door)? */
export function isStandableForGoblin(x: number, z: number, radius: number = ROAM_RADIUS): boolean {
  return isWalkableForGoblin(x, z, radius) && !inDoorBlindZone(x, z, radius);
}

/** Routes are planned with a 3 cm safety margin, so a path never clips the corner of a clearance box between two checks. */
export const PLAN_RADIUS = ROAM_RADIUS + 0.03;
export const GOBLIN_SPACES = {
  standable: (x: number, z: number) => isStandableForGoblin(x, z, PLAN_RADIUS),
  walkable: (x: number, z: number) => isWalkableForGoblin(x, z, PLAN_RADIUS),
};
