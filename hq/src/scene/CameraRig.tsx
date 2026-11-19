import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import { OrthographicCamera, Vector3 } from 'three';
import { introFrame } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { CAMERA, CORNERS, CV_STATION, GLASS_OFFICE, OFFICE, fitZoom } from './layout';
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
  const current = useMemo(() => overview.clone(), [overview]);
  const goal = useMemo(() => new Vector3(), []);
  const tilted = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    // The office turns smoothly towards the wanted angle, all the way round and as many times as the user likes.
    turned.yaw += (useHq.getState().yaw - turned.yaw) * (1 - Math.exp(-dt * 12));
    direction.set(...rotateDirection(base, turned.yaw)).normalize();
    right.crossVectors(UP, direction).normalize().negate();
    const fit = fitZoom(size.width, size.height);
    // The opening animation moves the camera itself: from the entrance, low and close, up and back to the overview.
    const intro = introFrame(introNow(), introClock.reduced);
    if (intro.active) {
      current.lerpVectors(overview, desk, intro.slide);
      tilted.copy(direction);
      tilted.y *= intro.elevation;
      camera.zoom = fit * intro.zoomFactor;
      camera.position.copy(current).addScaledVector(tilted.normalize(), CAMERA.distance);
      camera.lookAt(current);
      camera.updateProjectionMatrix();
      return;
    }
    const focused = focus !== null;
    const zoom = focused ? fit * (focus === 'scouting' ? CAMERA.scoutFocusFactor : focus === 'cv' ? CAMERA.cvFocusFactor : CAMERA.focusFactor) : fit;
    goal.copy(focus === 'reception' ? desk : focus === 'scouting' ? glass : focus === 'cv' ? station : overview);
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
