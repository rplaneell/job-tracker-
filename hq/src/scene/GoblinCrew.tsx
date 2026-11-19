import { modelUrl } from '../data/modelUrl';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CREW_SIZE, crewPoses, type Pose } from '../domain/goblins';
import { STATUS_LABEL, type ScoutStatus } from '../domain/scouting';
import { useHq } from '../state/useHq';
import { GLASS_OFFICE } from './layout';

const URL = modelUrl('goblin.glb');
/** The model is about 143 units tall; this makes a goblin roughly half a metre high, a little taller than a desk chair seat. */
const SCALE = 0.0036;
/** Where the model's feet and middle are, so it stands on its spot instead of floating or orbiting it. */
const FEET: [number, number, number] = [-2.7 * SCALE, -24.3 * SCALE, -37.5 * SCALE];
/** The model faces +z at rest (checked in a side by side render), so a spot's rotation is used as it is. */
const FACING_OFFSET = 0;

const CLIP_SPEED: Record<Pose, number> = { sleeping: 0, waiting: 0.5, working: 1.5, cheering: 2, slumped: 0 };

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Goblin({ index, pose, shadows }: { index: number; pose: Pose; shadows: boolean }) {
  const spot = GLASS_OFFICE.spots[index];
  const { scene, animations } = useGLTF(URL);
  const copy = useMemo(() => clone(scene), [scene]);
  const body = useRef<Group>(null);
  const { actions, names } = useAnimations(animations, body);
  const openDepartment = useHq((s) => s.openDepartment);
  const still = useMemo(reducedMotion, []);

  useEffect(() => {
    copy.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = shadows;
    });
  }, [copy, shadows]);

  useEffect(() => {
    const action = names[0] ? actions[names[0]] : undefined;
    action?.reset().play();
    return () => {
      action?.stop();
    };
  }, [actions, names]);

  useEffect(() => {
    const action = names[0] ? actions[names[0]] : undefined;
    if (action) action.timeScale = still ? 0 : CLIP_SPEED[pose];
  }, [actions, names, pose, still]);

  useFrame(({ clock }) => {
    const g = body.current;
    if (!g) return;
    const t = clock.elapsedTime + index * 0.9;
    let y = 0;
    let tilt = 0;
    let turn = 0;
    if (!still) {
      if (pose === 'sleeping') {
        tilt = 0.35;
        y = -0.03 + Math.sin(t * 0.8) * 0.01;
      } else if (pose === 'waiting') turn = Math.sin(t * 0.7) * 0.35;
      else if (pose === 'working') {
        tilt = 0.12 + Math.sin(t * 9) * 0.04;
        y = Math.abs(Math.sin(t * 6)) * 0.01;
      } else if (pose === 'cheering') y = Math.abs(Math.sin(t * 5)) * 0.18;
      else tilt = 0.55; // slumped
    } else if (pose === 'sleeping') tilt = 0.35;
    else if (pose === 'slumped') tilt = 0.55;
    g.position.y = y;
    g.rotation.x = tilt;
    g.rotation.y = spot.rotationY + FACING_OFFSET + turn;
  });

  return (
    <group position={[spot.x, 0, spot.z]}>
      <group
        ref={body}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDepartment('scouting');
        }}
      >
        <group scale={SCALE} position={[0, 0, 0]}>
          <primitive object={copy} position={[FEET[0] / SCALE, FEET[1] / SCALE, FEET[2] / SCALE]} />
        </group>
      </group>
    </group>
  );
}

/**
 * The Scouting agent's goblins. Their pose comes only from the real status, and the crew size is decoration.
 * Clicking one opens the Scouting panel.
 */
export function GoblinCrew({ status, shadows, simulated }: { status: ScoutStatus; shadows: boolean; simulated: boolean }) {
  const focus = useHq((s) => s.focus);
  const poses = useMemo(() => crewPoses(status, CREW_SIZE), [status]);
  const [cx, , cz] = GLASS_OFFICE.center;
  return (
    <>
      {poses.map((pose, i) => (
        <Goblin key={i} index={i} pose={pose} shadows={shadows} />
      ))}
      {focus === null && (
        <Html position={[cx, 3.1, cz]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="speech speech-on">
            <strong>Scouting crew</strong>
            <span>{simulated ? `Simulation: ${STATUS_LABEL[status]}` : STATUS_LABEL[status]}</span>
          </div>
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
