import { createIntroClock, introEnabledFromSearch } from '../domain/intro';

const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const enabled = typeof window !== 'undefined' && introEnabledFromSearch(window.location.search);

/** The one clock the opening animation runs on. The 3D scene and the screen overlay both read it, so they stay in step. */
export const introClock = createIntroClock({ enabled, reduced });

/** Milliseconds into the animation right now. */
export const introNow = () => introClock.ms(performance.now());
