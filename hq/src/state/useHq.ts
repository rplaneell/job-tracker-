import { create } from 'zustand';
import { introClock } from './introClock';

export type Department = 'reception' | 'scouting' | 'cv';

interface HqState {
  /** Which department the camera is focused on, if any. */
  focus: Department | null;
  hoverManager: boolean;
  creditsOpen: boolean;
  /** Turns off soft shadows to keep older laptops and phones smooth. */
  lowPower: boolean;
  /** False while the opening animation is still playing, so the header and buttons can fade in at the end. */
  chromeOn: boolean;
  /** False until a moment after the opening animation, so the speech bubbles do not spoil the first view. */
  labelsOn: boolean;
  openDepartment: (d: Department) => void;
  leave: () => void;
  setHoverManager: (v: boolean) => void;
  setCreditsOpen: (v: boolean) => void;
  setLowPower: (v: boolean) => void;
  setChromeOn: (v: boolean) => void;
  setLabelsOn: (v: boolean) => void;
}

export const useHq = create<HqState>((set) => ({
  focus: null,
  hoverManager: false,
  creditsOpen: false,
  lowPower: false,
  chromeOn: !introClock.enabled,
  labelsOn: !introClock.enabled,
  openDepartment: (focus) => set({ focus }),
  leave: () => set({ focus: null }),
  setHoverManager: (hoverManager) => set({ hoverManager }),
  setCreditsOpen: (creditsOpen) => set({ creditsOpen }),
  setLowPower: (lowPower) => set({ lowPower }),
  setChromeOn: (chromeOn) => set({ chromeOn }),
  setLabelsOn: (labelsOn) => set({ labelsOn }),
}));
