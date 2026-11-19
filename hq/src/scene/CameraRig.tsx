import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import { TOWER_WINDOW, introFrame, towerScale } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { CAMERA, CORNERS, CV_STATION, GLASS_OFFICE, LINKEDIN_STATION, OFFICE, fitZoom } from './layout';
import { rotateDirection } from './rotation';

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
    // The opening animation moves the camera itself. It starts low, as a side view of the whole office from the left, small enough
    // to fit in the window of the tower, and swings round and up into the normal view.
    const intro = introFrame(introNow(), introClock.reduced);
    if (intro.active) {
      // Seen from the side the office is about 13 m across, so it fills the window of the tower.
      const window = (TOWER_WINDOW.w * towerScale(size.width, size.height) * 0.92) / (13 * fit);
      const fitted = Math.min(1.5, Math.max(0.3, window));
      current.copy(overview);
      const [dx, dy, dz] = rotateDirection([direction.x, direction.y, direction.z], (intro.yaw * Math.PI) / 180);
      tilted.set(dx, dy * intro.elevation, dz);
      camera.zoom = fit * (1 + (fitted - 1) * intro.zoomIn);
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
