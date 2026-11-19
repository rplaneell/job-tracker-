import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Object3D } from 'three';
import { popScale } from '../domain/intro';
import { introClock, introNow } from '../state/introClock';

/** Makes a character pop in from nothing at `startMs` of the opening animation, standing on the spot where it is placed. */
export function useIntroPop(ref: RefObject<Object3D | null>, startMs: number): void {
  const settled = useRef(false);
  const apply = () => {
    const o = ref.current;
    if (!o) return;
    const ms = introNow();
    const s = popScale(ms, startMs, introClock.reduced);
    o.scale.setScalar(s);
    o.visible = s > 0;
    if (ms >= introClock.duration) settled.current = true;
  };
  useLayoutEffect(apply);
  useFrame(() => {
    if (!settled.current) apply();
  });
}
