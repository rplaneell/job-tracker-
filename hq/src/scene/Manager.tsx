import { Html, useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import type { Group } from 'three';
import { Mesh } from 'three';
import { useHq } from '../state/useHq';

const URL = '/models/manager.glb';

interface ManagerProps {
  position: [number, number, number];
  rotationY: number;
  /** What the character says, written by the app, so the scene holds no job search logic. */
  line: string;
  shadows: boolean;
}

/** The Office Manager, standing at her desk. Click her to open Reception. */
export function Manager({ position, rotationY, line, shadows }: ManagerProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(URL);
  const { actions, names } = useAnimations(animations, group);
  const hover = useHq((s) => s.hoverManager);
  const focus = useHq((s) => s.focus);
  const setHover = useHq((s) => s.setHoverManager);
  const openDepartment = useHq((s) => s.openDepartment);

  useEffect(() => {
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) o.castShadow = shadows;
    });
  }, [scene, shadows]);

  useEffect(() => {
    const action = names[0] ? actions[names[0]] : undefined;
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hover]);

  return (
    <group
      ref={group}
      position={position}
      rotation-y={rotationY}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        openDepartment('reception');
      }}
    >
      <primitive object={scene} />
      {focus === null && (
        <Html position={[0, 2.15, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`speech ${hover ? 'speech-on' : ''}`}>
            <strong>Office Manager</strong>
            <span>{line}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

useGLTF.preload(URL);
