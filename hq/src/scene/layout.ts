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
  /** Width of the side panel in pixels, so the focused desk can sit beside it. */
  panelPx: 400,
};

/** Pixels per metre that fit the whole building in the window with room for the interface. Roughly 18 m wide, 13 m tall. */
export function fitZoom(width: number, height: number): number {
  return Math.max(14, Math.min(width / 18, height / 13));
}
