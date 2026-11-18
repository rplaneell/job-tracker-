/** Where things are in the office model. Measured from the model file, in metres. */
export const OFFICE = {
  /** Middle of the floor plan. */
  center: [-5.04, 0.6, 5] as const,
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
