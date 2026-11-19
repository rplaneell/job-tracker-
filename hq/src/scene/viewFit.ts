/**
 * Fitting the opening animation to the office. Given the box the office fills and the direction the camera looks from, this works
 * out how big the office looks on screen (in metres across and up) and where its middle is, so the camera can be zoomed and
 * centred until the office fills the window of the tower exactly.
 */

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface ViewExtent {
  /** How wide the box looks, in metres, seen along this direction. */
  width: number;
  /** How tall the box looks, in metres. */
  height: number;
  /** Where the middle of the box is, to the right (+) or left (-) of the point the camera looks at, in metres. */
  centerRight: number;
  /** Where the middle of the box is, above (+) or below (-) the point the camera looks at, in metres. */
  centerUp: number;
  /** The camera's right and up directions in the world, so the shift can be turned back into a world position. */
  right: [number, number, number];
  up: [number, number, number];
}

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

/**
 * `direction` points from the office towards the camera. `lookAt` is the point the camera is aimed at. The camera is upright,
 * like the one in the scene.
 */
export function viewExtent(bounds: Bounds, direction: V3, lookAt: V3): ViewExtent {
  const d = unit(direction);
  const right = unit(cross([0, 1, 0], d));
  const up = unit(cross(d, right));
  const rs: number[] = [];
  const us: number[] = [];
  for (const x of [bounds.minX, bounds.maxX]) {
    for (const y of [0, bounds.height]) {
      for (const z of [bounds.minZ, bounds.maxZ]) {
        const p: V3 = [x - lookAt[0], y - lookAt[1], z - lookAt[2]];
        rs.push(dot(p, right));
        us.push(dot(p, up));
      }
    }
  }
  const rMin = Math.min(...rs);
  const rMax = Math.max(...rs);
  const uMin = Math.min(...us);
  const uMax = Math.max(...us);
  return { width: rMax - rMin, height: uMax - uMin, centerRight: (rMax + rMin) / 2, centerUp: (uMax + uMin) / 2, right, up };
}

/**
 * How many pixels per metre make a box of this look fit a window of this many pixels, leaving a small margin, so that
 * the whole box is inside whichever way is the tighter fit.
 */
export function zoomToFit(extent: Pick<ViewExtent, 'width' | 'height'>, windowW: number, windowH: number, fill = 0.94): number {
  return Math.min((windowW * fill) / extent.width, (windowH * fill) / extent.height);
}
