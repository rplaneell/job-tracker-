import { create } from 'zustand';

export type Department = 'reception';

interface HqState {
  /** Which department the camera is focused on, if any. */
  focus: Department | null;
  hoverManager: boolean;
  creditsOpen: boolean;
  /** Turns off soft shadows to keep older laptops and phones smooth. */
  lowPower: boolean;
  openDepartment: (d: Department) => void;
  leave: () => void;
  setHoverManager: (v: boolean) => void;
  setCreditsOpen: (v: boolean) => void;
  setLowPower: (v: boolean) => void;
}

export const useHq = create<HqState>((set) => ({
  focus: null,
  hoverManager: false,
  creditsOpen: false,
  lowPower: false,
  openDepartment: (focus) => set({ focus }),
  leave: () => set({ focus: null }),
  setHoverManager: (hoverManager) => set({ hoverManager }),
  setCreditsOpen: (creditsOpen) => set({ creditsOpen }),
  setLowPower: (lowPower) => set({ lowPower }),
}));
