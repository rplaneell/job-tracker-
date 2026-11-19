import { create } from 'zustand';

export type Department = 'reception' | 'scouting' | 'cv';

interface HqState {
  /** Which department the camera is focused on, if any. */
  focus: Department | null;
  hoverManager: boolean;
  creditsOpen: boolean;
  /** Turns off soft shadows to keep older laptops and phones smooth. */
  lowPower: boolean;
  /** How far the office is turned, in radians. It is not wrapped, so turning past a full circle just keeps going. */
  yaw: number;
  rotateBy: (delta: number) => void;
  resetView: () => void;
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
  yaw: 0,
  rotateBy: (delta) => set((s) => (Number.isFinite(delta) ? { yaw: s.yaw + delta } : s)),
  resetView: () => set({ yaw: 0 }),
  openDepartment: (focus) => set({ focus }),
  leave: () => set({ focus: null }),
  setHoverManager: (hoverManager) => set({ hoverManager }),
  setCreditsOpen: (creditsOpen) => set({ creditsOpen }),
  setLowPower: (lowPower) => set({ lowPower }),
}));
