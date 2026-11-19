import { modelUrl } from '../data/modelUrl';
import { useGLTF } from '@react-three/drei';
import { useLayoutEffect } from 'react';
import { Mesh } from 'three';
import { applyPalette } from './palette';

const URL = modelUrl('office.glb');

/** The glass walled office floor. Every surface takes and casts soft shadows. */
export function Office({ shadows }: { shadows: boolean }) {
  const { scene } = useGLTF(URL);
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
  return <primitive object={scene} />;
}

useGLTF.preload(URL);
