import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Mesh, type Material } from 'three';
import { revealLift, waveOf, type Wave } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';
import { applyPalette } from './palette';

const URL = '/models/office.glb';

interface Part {
  mesh: Mesh;
  restY: number;
  wave: Wave;
}

/** The glass walled office floor. Every surface takes and casts soft shadows. */
export function Office({ shadows }: { shadows: boolean }) {
  const { scene } = useGLTF(URL);
  const settled = useRef(false);
  useLayoutEffect(() => {
    applyPalette(scene);
  }, [scene]);
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) {
        o.castShadow = shadows;
        o.receiveShadow = shadows;
      }
    });
  }, [scene, shadows]);

  // For the opening animation: every part knows its resting height and which group it builds with.
  const parts = useMemo<Part[]>(() => {
    const list: Part[] = [];
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material | undefined;
      list.push({ mesh, restY: mesh.position.y, wave: waveOf(material?.name ?? '') });
    });
    return list;
  }, [scene]);

  const apply = () => {
    const ms = introNow();
    for (const p of parts) {
      const { visible, lift } = revealLift(ms, p.wave, introClock.reduced);
      p.mesh.visible = visible;
      p.mesh.position.y = p.restY + lift;
    }
    if (ms >= introClock.duration) settled.current = true;
  };
  useLayoutEffect(apply, [parts]);
  useFrame(() => {
    if (!settled.current) apply();
  });

  return <primitive object={scene} />;
}

useGLTF.preload(URL);
