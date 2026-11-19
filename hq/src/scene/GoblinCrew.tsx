import { modelUrl } from '../data/modelUrl';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { AnimationAction, Group, Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CREW_SIZE } from '../domain/goblins';
import { POP_START } from '../domain/intro';
import { behaviorFor, frameAt, makeSchedule } from '../domain/roam';
import { STATUS_LABEL, type ScoutStatus } from '../domain/scouting';
import { useHq } from '../state/useHq';
import { GLASS_OFFICE, GOBLIN_SPACES } from './layout';
import { measureModel } from './measure';
import { useIntroPop } from './useIntroPop';

const URL = modelUrl('goblin.glb');
/** About half a metre tall, a little taller than a desk chair seat, next to the 1.7 m people. */
const HEIGHT = 0.5;
/** The model faces +z at rest (checked in a side by side render), so a heading is used as it is. */
const FACING_OFFSET = 0;
/** Which height the goblin turns over around in a backflip: about the middle of its body. */
const PIVOT = HEIGHT / 2;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function Goblin({ index, status, shadows }: { index: number; status: ScoutStatus; shadows: boolean }) {
  const spot = GLASS_OFFICE.spots[index];
  const { scene, animations } = useGLTF(URL);
  const copy = useMemo(() => clone(scene), [scene]);
  const place = useRef<Group>(null);
  const walker = useRef<Group>(null);
  const pivot = useRef<Group>(null);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  useIntroPop(place, POP_START.goblins + index * POP_START.goblinStep);
  const openDepartment = useHq((s) => s.openDepartment);
  const still = useMemo(reducedMotion, []);
  const fit = useMemo(() => measureModel(scene, animations, HEIGHT, 'WalkBaked'), [scene, animations]);
  // Where each goblin goes comes from its real Scouting status: calm when idle, a party when a review has just finished,
  // and no roaming at all when Scouting failed. The same seed always gives the same route.
  const behavior = useMemo(() => behaviorFor(status), [status]);
  const schedule = useMemo(() => makeSchedule(index + 1, { x: spot.x, z: spot.z }, behavior, GOBLIN_SPACES), [index, spot.x, spot.z, behavior]);
  const clip = (suffix: string): AnimationAction | undefined => actions[Object.keys(actions).find((n) => n.endsWith(suffix)) ?? ''] ?? undefined;

  useEffect(() => {
    copy.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = shadows;
    });
  }, [copy, shadows]);

  useEffect(() => {
    const walk = clip('WalkBaked');
    const jump = clip('Jump1Baked');
    walk?.reset().play();
    jump?.reset().play();
    if (jump) jump.weight = 0;
    return () => {
      walk?.stop();
      jump?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame(({ clock }) => {
    const w = walker.current;
    const p = pivot.current;
    if (!w || !p) return;
    const walk = clip('WalkBaked');
    const jump = clip('Jump1Baked');
    if (still || !behavior.roam) {
      // Reduced motion, or Scouting failed: the goblin stays on its spot. A failed crew is slumped.
      w.position.set(0, 0, 0);
      w.rotation.y = spot.rotationY + FACING_OFFSET;
      p.rotation.x = status === 'failed' ? 0.55 : 0;
      p.scale.set(1, 1, 1);
      if (walk) walk.timeScale = 0;
      return;
    }
    const f = frameAt(schedule, clock.elapsedTime + index * 7);
    w.position.set(f.x - spot.x, f.y, f.z - spot.z);
    w.rotation.y = f.heading + FACING_OFFSET;
    p.rotation.x = -f.flip; // a backflip: the head goes back and over
    p.scale.set(1 + 0.18 * f.squash, 1 - 0.3 * f.squash, 1 + 0.18 * f.squash);
    const airborne = f.move === 'hop' || f.move === 'flip' || f.move === 'drop';
    if (walk) {
      walk.weight = airborne ? 0 : 1;
      walk.timeScale = f.move === 'walk' ? Math.max(0.3, behavior.speed / 0.3) : 0;
    }
    if (jump) {
      jump.weight = airborne ? 1 : 0;
      jump.paused = true;
      jump.time = Math.min(f.clipTime, jump.getClip().duration - 0.01);
    }
  });

  return (
    <group ref={place} position={[spot.x, 0, spot.z]}>
      <group
        ref={walker}
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
        <group ref={pivot} position={[0, PIVOT, 0]}>
          <group ref={root} position={[0, -PIVOT, 0]} scale={fit.scale}>
            <primitive object={copy} position={fit.offset} />
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * The Scouting agent's goblins. How lively they are comes only from the real status, and the crew size is decoration.
 * They roam their own glass office, hop, and drop from the roof in backflips. Clicking one opens the Scouting panel.
 */
export function GoblinCrew({ status, shadows, simulated }: { status: ScoutStatus; shadows: boolean; simulated: boolean }) {
  const focus = useHq((s) => s.focus);
  const labelsOn = useHq((s) => s.labelsOn);
  const [cx, , cz] = GLASS_OFFICE.center;
  return (
    <>
      {Array.from({ length: CREW_SIZE }, (_, i) => (
        <Goblin key={i} index={i} status={status} shadows={shadows} />
      ))}
      {focus === null && labelsOn && (
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
