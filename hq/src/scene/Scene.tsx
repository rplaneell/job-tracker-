import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import type { ScoutStatus } from '../domain/scouting';
import { SHADOWS_AT_MS } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { useHq } from '../state/useHq';
import { CameraRig } from './CameraRig';
import { LinkedInDesk } from './LinkedInDesk';
import type { LinkedInStatus } from '../domain/linkedin';
import { CvTailor } from './CvTailor';
import { GoblinCrew } from './GoblinCrew';
import { Lighting } from './Lighting';
import { Manager } from './Manager';
import { Office } from './Office';
import { SafeBoundary } from './SafeBoundary';
import { CORNERS, OFFICE } from './layout';

interface SceneProps {
  managerLine: string;
  corner: number;
  /** The real status of the Scouting agent. It decides how the goblins behave. */
  scoutStatus: ScoutStatus;
  /** The real status of the CV agent. It decides what the CV Tailor character does. */
  cvStatus: ScoutStatus;
  linkedinStatus: LinkedInStatus;
  /** True while the status is sample data, so the label above the goblins says so. */
  simulated: boolean;
}

/** Tells the page, and the screenshot checks, that the models have finished loading. */
function ReadyFlag() {
  useEffect(() => {
    document.body.dataset.ready = '1';
    // Everything has loaded, so the opening animation can start from its first frame.
    introClock.begin(performance.now());
  }, []);
  return null;
}

/**
 * The soft shadow on the floor is drawn once, so it must wait until everything has landed (during the opening animation),
 * or it would be drawn from an empty room.
 */
function FloorShadows() {
  const at = Math.min(SHADOWS_AT_MS, introClock.duration);
  const [on, setOn] = useState(() => introNow() >= at);
  useFrame(() => {
    if (!on && introNow() >= at) setOn(true);
  });
  if (!on) return null;
  return <ContactShadows position={[OFFICE.center[0], -0.27, OFFICE.center[2]]} scale={24} blur={3.2} far={2.5} opacity={0.32} frames={1} resolution={512} />;
}

/** The 3D office. It gets plain values in and reports clicks through the store. It never touches job data. */
export function Scene({ managerLine, corner, scoutStatus, cvStatus, linkedinStatus, simulated }: SceneProps) {
  const lowPower = useHq((s) => s.lowPower);
  const shadows = !lowPower;
  const dir = CORNERS[corner] ?? CORNERS[0];
  return (
    <Canvas
      orthographic
      shadows={shadows ? 'percentage' : false}
      dpr={[1, 1.75]}
      camera={{
        position: [OFFICE.center[0] + dir[0] * 40, OFFICE.center[1] + dir[1] * 40, OFFICE.center[2] + dir[2] * 40],
        zoom: 60,
        near: -80,
        far: 160,
      }}
      gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace, toneMappingExposure: 1.12 }}
      onPointerMissed={() => useHq.getState().leave()}
    >
      <Lighting shadows={shadows} />
      <Suspense fallback={null}>
        <Office shadows={shadows} />
        <Manager position={[-1.0, 0, 4.9]} rotationY={-Math.PI / 2} line={managerLine} shadows={shadows} />
        <SafeBoundary>
          <GoblinCrew status={scoutStatus} shadows={shadows} simulated={simulated} />
        </SafeBoundary>
        <SafeBoundary>
          <CvTailor status={cvStatus} shadows={shadows} simulated={simulated} />
        </SafeBoundary>
        <SafeBoundary>
          <LinkedInDesk status={linkedinStatus} shadows={shadows} simulated={simulated} />
        </SafeBoundary>
        <FloorShadows />
        <ReadyFlag />
      </Suspense>
      <CameraRig corner={corner} />
    </Canvas>
  );
}
