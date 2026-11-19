import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import { ARRIVAL, TOWER_WINDOW, introFrame, towerScale } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { CAMERA, CORNERS, CV_STATION, GLASS_OFFICE, LINKEDIN_STATION, OFFICE, fitZoom } from './layout';
import { rotateDirection } from './rotation';
import { viewExtent, zoomToFit } from './viewFit';

const UP = new Vector3(0, 1, 0);

/** Glides between the overview and a department. The view stays isometric the whole time. */
export function CameraRig({ corner }: { corner: number }) {
  const focus = useHq((s) => s.focus);
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const base = CORNERS[corner] ?? CORNERS[0];
  const direction = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const turned = useMemo(() => ({ yaw: useHq.getState().yaw }), []);
  const overview = useMemo(() => new Vector3(...OFFICE.center), []);
  const desk = useMemo(() => new Vector3(...OFFICE.desk.center), []);
  const glass = useMemo(() => new Vector3(...GLASS_OFFICE.center), []);
  const station = useMemo(() => new Vector3(...CV_STATION.center), []);
  const linkedin = useMemo(() => new Vector3(...LINKEDIN_STATION.center), []);
  const current = useMemo(() => overview.clone(), [overview]);
  const goal = useMemo(() => new Vector3(), []);
  const tilted = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    // The office turns smoothly towards the wanted angle, all the way round and as many times as the user likes.
    turned.yaw += (useHq.getState().yaw - turned.yaw) * (1 - Math.exp(-dt * 12));
    direction.set(...rotateDirection(base, turned.yaw)).normalize();
    right.crossVectors(UP, direction).normalize().negate();
    const fit = fitZoom(size.width, size.height);
    // The opening animation moves the camera itself. The drone arrives at the office floor of the tower, and the camera then sees the
    // whole office from the left, low and to scale, filling the window of the tower exactly. It then zooms out and swings round
    // into the normal dashboard view.
    const intro = introFrame(introNow(), introClock.reduced);
    if (intro.active) {
      const dir: [number, number, number] = [direction.x, direction.y, direction.z];
      const [ax, ay, az] = rotateDirection(dir, (ARRIVAL.yaw * Math.PI) / 180);
      const arrival = viewExtent(OFFICE.bounds, [ax, ay * ARRIVAL.elevation, az], [overview.x, overview.y, overview.z]);
      const k = towerScale(size.width, size.height);
      // The office touches the edges of the window, because its walls are the limits of the building.
      const fitted = zoomToFit(arrival, TOWER_WINDOW.w * k, TOWER_WINDOW.h * k, 1) / fit;
      camera.zoom = fit * (1 + (fitted - 1) * intro.zoomIn);
      // Centre the office in the window at arrival, and ease back to the normal centre as the camera zooms out.
      current.copy(overview);
      current.x += (arrival.right[0] * arrival.centerRight + arrival.up[0] * arrival.centerUp) * intro.zoomIn;
      current.y += (arrival.right[1] * arrival.centerRight + arrival.up[1] * arrival.centerUp) * intro.zoomIn;
      current.z += (arrival.right[2] * arrival.centerRight + arrival.up[2] * arrival.centerUp) * intro.zoomIn;
      const [dx, dy, dz] = rotateDirection(dir, (intro.yaw * Math.PI) / 180);
      tilted.set(dx, dy * intro.elevation, dz);
      camera.position.copy(current).addScaledVector(tilted.normalize(), CAMERA.distance);
      camera.lookAt(current);
      camera.updateProjectionMatrix();
      return;
    }
    const focused = focus !== null;
    const zoom = focused ? fit * (focus === 'scouting' ? CAMERA.scoutFocusFactor : focus === 'cv' ? CAMERA.cvFocusFactor : focus === 'linkedin' ? CAMERA.linkedinFocusFactor : CAMERA.focusFactor) : fit;
    goal.copy(focus === 'reception' ? desk : focus === 'scouting' ? glass : focus === 'cv' ? station : focus === 'linkedin' ? linkedin : overview);
    if (focused && size.width >= 900) {
      // Slide the view so the desk sits in the free area to the left of the side panel.
      goal.addScaledVector(right, CAMERA.panelPx / 2 / zoom);
    }
    const k = 1 - Math.exp(-dt * 4.5);
    current.lerp(goal, k);
    camera.zoom += (zoom - camera.zoom) * k;
    camera.position.copy(current).addScaledVector(direction, CAMERA.distance);
    camera.lookAt(current);
    camera.updateProjectionMatrix();
  });
  return null;
}
