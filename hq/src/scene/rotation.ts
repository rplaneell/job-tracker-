/** Turning the office all the way round. Only the viewing direction turns around the upright axis; its height never changes. */

/** One arrow key press turns the office 15 degrees. */
export const KEY_STEP = (2 * Math.PI) / 24;

/** How far the office turns for a sideways drag of this many pixels. About 790 px is a full circle. */
export function yawFromDrag(dxPx: number): number {
  return dxPx * 0.008;
}

/** The viewing direction (from the office towards the camera) turned by yaw radians around the upright axis. */
export function rotateDirection(direction: readonly [number, number, number], yaw: number): [number, number, number] {
  if (yaw === 0) return [direction[0], direction[1], direction[2]];
  const [x, y, z] = direction;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [x * c + z * s, y, -x * s + z * c];
}
