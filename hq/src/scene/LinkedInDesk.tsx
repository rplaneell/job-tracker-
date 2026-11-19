import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { CanvasTexture, SRGBColorSpace, type AnimationAction, type Group, type Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { modelUrl } from '../data/modelUrl';
import { POP_START } from '../domain/intro';
import { LINKEDIN_LABEL, type LinkedInStatus } from '../domain/linkedin';
import { useHq } from '../state/useHq';
import { LINKEDIN_STATION } from './layout';
import { measureModel } from './measure';
import { useIntroPop } from './useIntroPop';

const URL = modelUrl('linkedin_host.glb');
const HEIGHT = 1.62;
const BLUE = '#0a66c2';
const TABLE_TOP = LINKEDIN_STATION.table.height;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The blue rounded square with a white "in", drawn on a canvas so no image file is needed. */
function logoTexture(withWord: boolean): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = withWord ? 512 : 256;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = BLUE;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ffffff';
    g.font = 'bold 150px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('in', 128, withWord ? 150 : 135);
    if (withWord) {
      g.font = 'bold 54px system-ui, sans-serif';
      g.fillText('LinkedIn', 128, 330);
      g.font = '28px system-ui, sans-serif';
      g.fillText('your next role', 128, 400);
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** The merchandise table: wooden top and legs, a blue runner, cards, two mugs and a tote bag. */
function Table({ shadows }: { shadows: boolean }) {
  const { table } = LINKEDIN_STATION;
  const w = table.maxX - table.minX;
  const d = table.maxZ - table.minZ;
  const logo = useMemo(() => logoTexture(false), []);
  useEffect(() => () => logo.dispose(), [logo]);
  const legs: [number, number][] = [[-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05], [-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05]];
  return (
    <group position={[(table.minX + table.maxX) / 2, 0, (table.minZ + table.maxZ) / 2]}>
      <mesh position={[0, TABLE_TOP - 0.025, 0]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial color="#b98a5c" roughness={0.7} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, (TABLE_TOP - 0.05) / 2, z]} castShadow={shadows}>
          <boxGeometry args={[0.05, TABLE_TOP - 0.05, 0.05]} />
          <meshStandardMaterial color="#8a6340" roughness={0.8} />
        </mesh>
      ))}
      {/* blue runner along the table */}
      <mesh position={[0, TABLE_TOP + 0.003, 0]} receiveShadow={shadows}>
        <boxGeometry args={[w * 0.96, 0.006, d * 0.55]} />
        <meshStandardMaterial color={BLUE} roughness={0.6} />
      </mesh>
      {/* a fan of business cards */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.42 + i * 0.012, TABLE_TOP + 0.012 + i * 0.006, 0.17]} rotation-y={-0.5 + i * 0.25} castShadow={shadows}>
          <boxGeometry args={[0.09, 0.004, 0.055]} />
          <meshStandardMaterial color={i === 1 ? '#ffffff' : '#e8f1fb'} roughness={0.5} />
        </mesh>
      ))}
      {/* two mugs: white with a blue band */}
      {[0.15, 0.3].map((x, i) => (
        <group key={i} position={[x, TABLE_TOP + 0.045, -0.02 + i * 0.1]}>
          <mesh castShadow={shadows}>
            <cylinderGeometry args={[0.04, 0.036, 0.09, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.0415, 0.0375, 0.04, 24]} />
            <meshStandardMaterial color={BLUE} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* a tote bag leaning at the back */}
      <mesh position={[-0.1, TABLE_TOP + 0.13, -0.22]} rotation-y={Math.PI / 4} castShadow={shadows}>
        <boxGeometry args={[0.24, 0.26, 0.05]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.9} />
      </mesh>
      <mesh position={[-0.1 + 0.0276, TABLE_TOP + 0.13, -0.22 + 0.0276]} rotation-y={Math.PI / 4}>
        <planeGeometry args={[0.14, 0.14]} />
        <meshBasicMaterial map={logo} />
      </mesh>
    </group>
  );
}

/** A roll up banner standing on the floor beside the table. */
function Banner({ shadows }: { shadows: boolean }) {
  const tex = useMemo(() => logoTexture(true), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const [x, z] = [LINKEDIN_STATION.table.minX - 0.3, LINKEDIN_STATION.table.minZ + 0.45];
  return (
    <group position={[x, 0, z]} rotation-y={Math.PI / 4}>
      <mesh position={[0, 0.03, 0]} castShadow={shadows}>
        <boxGeometry args={[0.5, 0.06, 0.16]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow={shadows}>
        <planeGeometry args={[0.42, 1.7]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <mesh position={[0, 0.9, -0.004]}>
        <planeGeometry args={[0.44, 1.72]} />
        <meshStandardMaterial color="#1b1f24" />
      </mesh>
    </group>
  );
}

/** The woman who runs the desk, standing behind the table facing the camera. */
function Host({ status, shadows }: { status: LinkedInStatus; shadows: boolean }) {
  const { scene, animations } = useGLTF(URL);
  const copy = useMemo(() => clone(scene), [scene]);
  const place = useRef<Group>(null);
  const sway = useRef<Group>(null);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  useIntroPop(place, POP_START.linkedin);
  const fit = useMemo(() => measureModel(scene, animations, HEIGHT, 'WomanStandingPose'), [scene, animations]);
  const still = useMemo(reducedMotion, []);

  useEffect(() => {
    copy.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = shadows;
    });
  }, [copy, shadows]);

  useEffect(() => {
    const a = (Object.values(actions)[0] ?? undefined) as AnimationAction | undefined;
    a?.reset().play();
    if (a) a.timeScale = still ? 0 : 1;
    return () => {
      a?.stop();
    };
  }, [actions, still]);

  const { x, z, rotationY } = LINKEDIN_STATION.spot;
  return (
    <group ref={place} position={[x, 0, z]} rotation-y={rotationY}>
      <group ref={sway}>
        <group ref={root} scale={fit.scale}>
          <primitive object={copy} position={fit.offset} />
        </group>
      </group>
      {/* a little extra life when alerts have just arrived: a slow happy sway */}
      <Sway target={sway} active={status === 'completed' && !still} />
    </group>
  );
}

function Sway({ target, active }: { target: RefObject<Group | null>; active: boolean }) {
  useFrame(({ clock }) => {
    const g = target.current;
    if (!g) return;
    g.rotation.z = active ? Math.sin(clock.elapsedTime * 1.6) * 0.05 : 0;
    g.position.y = active ? Math.abs(Math.sin(clock.elapsedTime * 1.6)) * 0.02 : 0;
  });
  return null;
}

/** The LinkedIn desk: the table with its merchandise and the person who runs it. Clicking any part opens the LinkedIn panel. */
export function LinkedInDesk({ status, shadows, simulated }: { status: LinkedInStatus; shadows: boolean; simulated: boolean }) {
  const focus = useHq((s) => s.focus);
  const labelsOn = useHq((s) => s.labelsOn);
  const openDepartment = useHq((s) => s.openDepartment);
  const [cx, , cz] = LINKEDIN_STATION.center;
  return (
    <>
      <group
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          openDepartment('linkedin');
        }}
      >
        <Table shadows={shadows} />
        <Banner shadows={shadows} />
        <Host status={status} shadows={shadows} />
      </group>
      {focus === null && labelsOn && (
        <Html position={[cx, 2.5, cz]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="speech speech-on">
            <strong>LinkedIn desk</strong>
            <span>{simulated ? `Simulation: ${LINKEDIN_LABEL[status]}` : LINKEDIN_LABEL[status]}</span>
          </div>
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
