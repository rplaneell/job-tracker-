import { modelUrl } from '../data/modelUrl';
import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { AnimationMixer, Box3, LoopOnce, LoopRepeat, type AnimationClip, type Group, type Mesh, type Object3D } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { cvClip } from '../domain/cvAgent';
import { POP_START } from '../domain/intro';
import { STATUS_LABEL, type ScoutStatus } from '../domain/scouting';
import { useHq } from '../state/useHq';
import { CV_STATION } from './layout';
import { useIntroPop } from './useIntroPop';

const URL = modelUrl('cv_tailor.glb');
/** About the height of the Office Manager, so the two read as grown ups next to the small goblins. */
const HEIGHT = 1.7;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * How to size and place the model so it stands on the floor at its spot. It is measured on a separate copy that is not
 * placed anywhere, in the pose it stands in, so the numbers describe only the model (not where it is in the office).
 */
function measure(scene: Object3D, animations: AnimationClip[]): { scale: number; offset: [number, number, number] } {
  const probe = clone(scene);
  const idle = animations.find((a) => a.name.endsWith('|idle'));
  if (idle) new AnimationMixer(probe).clipAction(idle).play().getMixer().update(0.05);
  probe.updateMatrixWorld(true);
  const box = new Box3().setFromObject(probe, true);
  const height = box.max.y - box.min.y;
  if (!(height > 0.1)) return { scale: 1, offset: [0, 0, 0] };
  return { scale: HEIGHT / height, offset: [-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2] };
}

/**
 * The CV Tailor: a person at the middle of the open office. What the character does comes only from the real status of the
 * cv agent (through cvClip), never from anything else. Clicking opens the CV panel.
 */
function Person({ status, shadows }: { status: ScoutStatus; shadows: boolean }) {
  const { scene, animations } = useGLTF(URL);
  const copy = useMemo(() => clone(scene), [scene]);
  const root = useRef<Group>(null);
  const place = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  useIntroPop(place, POP_START.cv);
  const openDepartment = useHq((s) => s.openDepartment);
  const fit = useMemo(() => measure(scene, animations), [scene, animations]);
  const still = useMemo(reducedMotion, []);
  const plan = cvClip(status);
  const action = (clip: string) => actions[Object.keys(actions).find((n) => n.endsWith(`|${clip}`)) ?? ''];

  useEffect(() => {
    copy.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = shadows;
    });
  }, [copy, shadows]);

  useEffect(() => {
    const a = action(plan.clip);
    if (!a) return;
    a.reset();
    a.setLoop(plan.once ? LoopOnce : LoopRepeat, plan.once ? 1 : Infinity);
    a.clampWhenFinished = plan.once;
    a.timeScale = still ? 0 : plan.speed;
    a.fadeIn(0.25).play();
    return () => {
      a.fadeOut(0.2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, plan.clip, plan.once, plan.speed, still]);

  const { x, z, rotationY } = CV_STATION.spot;
  return (
    <group ref={place} position={[x, 0, z]} rotation-y={rotationY}>
      <group
        ref={root}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDepartment('cv');
        }}
      >
        <group scale={fit.scale}>
          <primitive object={copy} position={fit.offset} />
        </group>
      </group>
    </group>
  );
}

export function CvTailor({ status, shadows, simulated }: { status: ScoutStatus; shadows: boolean; simulated: boolean }) {
  const focus = useHq((s) => s.focus);
  const labelsOn = useHq((s) => s.labelsOn);
  const [cx, , cz] = CV_STATION.center;
  return (
    <>
      <Person status={status} shadows={shadows} />
      {focus === null && labelsOn && (
        <Html position={[cx, 2.5, cz]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="speech speech-on">
            <strong>CV Tailor</strong>
            <span>{simulated ? `Simulation: ${STATUS_LABEL[status]}` : STATUS_LABEL[status]}</span>
          </div>
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
