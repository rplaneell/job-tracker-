import type { ScoutStatus } from './scouting';

/** The animation clips inside cv_tailor.glb (the other seven the file came with were removed). */
export const CV_CLIPS = ['idle', 'picking_up', 'jumping', 'fall'] as const;
export type CvClip = (typeof CV_CLIPS)[number];

export interface ClipPlan {
  clip: CvClip;
  /** Playback speed. */
  speed: number;
  /** Play once and hold the last frame, instead of looping. */
  once: boolean;
}

/**
 * What the CV Tailor character does for each real status of the cv agent. The status comes from the newest cv task row,
 * through the same rules as Scouting, so the character never shows activity that did not happen.
 */
export function cvClip(status: ScoutStatus): ClipPlan {
  switch (status) {
    case 'idle':
      return { clip: 'idle', speed: 0.4, once: false };
    case 'waiting':
      return { clip: 'idle', speed: 0.7, once: false };
    case 'working':
      return { clip: 'picking_up', speed: 1, once: false };
    case 'completed':
      return { clip: 'jumping', speed: 1, once: false };
    case 'failed':
      return { clip: 'fall', speed: 1, once: true };
  }
}
