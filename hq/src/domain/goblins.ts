import type { ScoutStatus } from './scouting';

/** How a goblin looks. Every pose maps to one real Scouting status, so the office never shows invented activity. */
export type Pose = 'sleeping' | 'waiting' | 'working' | 'cheering' | 'slumped';

/** The crew is decoration: four goblins always sit in the glass office, whatever the number of roles. */
export const CREW_SIZE = 4;

const POSE_FOR_STATUS: Record<ScoutStatus, Pose> = {
  idle: 'sleeping',
  waiting: 'waiting',
  working: 'working',
  completed: 'cheering',
  failed: 'slumped',
};

export function crewPoses(status: ScoutStatus, crewSize: number): Pose[] {
  const n = Number.isFinite(crewSize) ? Math.max(0, Math.floor(crewSize)) : 0;
  return Array<Pose>(n).fill(POSE_FOR_STATUS[status]);
}
