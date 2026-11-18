import { describe, expect, it } from 'vitest';
import { CREW_SIZE, crewPoses, type Pose } from './goblins';
import type { ScoutStatus } from './scouting';

const EXPECTED: Record<ScoutStatus, Pose> = {
  idle: 'sleeping',
  waiting: 'waiting',
  working: 'working',
  completed: 'cheering',
  failed: 'slumped',
};

describe('crewPoses', () => {
  it('has a crew of four', () => expect(CREW_SIZE).toBe(4));
  it.each(Object.entries(EXPECTED) as [ScoutStatus, Pose][])('%s gives every goblin the %s pose', (status, pose) =>
    expect(crewPoses(status, CREW_SIZE)).toEqual(Array(CREW_SIZE).fill(pose)));
  it('returns exactly as many poses as the crew size', () => {
    for (const n of [1, 2, 7]) expect(crewPoses('working', n)).toHaveLength(n);
  });
  it('returns nothing for a crew of zero or less', () => {
    expect(crewPoses('working', 0)).toEqual([]);
    expect(crewPoses('working', -2)).toEqual([]);
  });
  it('rounds down a fractional crew size and never returns NaN sized lists', () => {
    expect(crewPoses('idle', 2.9)).toHaveLength(2);
    expect(crewPoses('idle', Number.NaN)).toEqual([]);
  });
});
