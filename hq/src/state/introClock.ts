import { createIntroClock, introEnabledFromSearch } from '../domain/intro';

const SEEN_KEY = 'hq-intro-seen';

/** Browsers can refuse storage (private windows, blocked cookies), so every access is guarded. */
function seenThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Nothing to do: the animation will simply play again next time.
  }
}

const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const enabled = typeof window !== 'undefined' && introEnabledFromSearch(window.location.search, seenThisSession());

const clock = createIntroClock({ enabled, reduced });

/** The one clock the opening animation runs on. The 3D scene and the screen overlay both read it, so they stay in step. */
export const introClock = {
  ...clock,
  /** Starts the count, and remembers that this session has now seen the animation. */
  begin: (now: number) => {
    if (clock.enabled) markSeen();
    clock.begin(now);
  },
};

let modelsReady = false;
let picturesReady = !enabled || reduced; // the reduced motion fade and the skipped animation need no pictures
let started = false;

function maybeStart(): void {
  if (started || !modelsReady || !picturesReady) return;
  started = true;
  const now = performance.now();
  introClock.begin(now);
  document.body.dataset.introStart = String(Math.round(now));
}

/** The animation starts only when everything it shows has loaded: the 3D models and the painted tower, so it is never cut short. */
export const introGate = {
  modelsReady: () => {
    modelsReady = true;
    maybeStart();
  },
  picturesReady: () => {
    picturesReady = true;
    maybeStart();
  },
};

/** Milliseconds into the animation right now. */
export const introNow = () => clock.ms(performance.now());
