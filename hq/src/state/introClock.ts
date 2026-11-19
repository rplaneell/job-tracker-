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

/** Milliseconds into the animation right now. */
export const introNow = () => clock.ms(performance.now());
