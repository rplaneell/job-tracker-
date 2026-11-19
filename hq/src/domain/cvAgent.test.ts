import { describe, expect, it } from 'vitest';
import { CV_CLIPS, cvClip } from './cvAgent';
import type { ScoutStatus } from './scouting';

describe('cvClip', () => {
  const cases: [ScoutStatus, string, boolean][] = [
    ['idle', 'idle', false],
    ['waiting', 'idle', false],
    ['working', 'picking_up', false],
    ['completed', 'jumping', false],
    ['failed', 'fall', true],
  ];
  it.each(cases)('%s plays the %s clip (play once: %s)', (status, clip, once) => {
    const c = cvClip(status);
    expect(c.clip).toBe(clip);
    expect(c.once).toBe(once);
  });

  it('only ever names clips that the model file really has', () => {
    for (const status of ['idle', 'waiting', 'working', 'completed', 'failed'] as const) expect(CV_CLIPS).toContain(cvClip(status).clip);
  });

  it('plays a waiting person slower than a working one, and a resting one slowest', () => {
    expect(cvClip('waiting').speed).toBeLessThan(cvClip('working').speed);
    expect(cvClip('idle').speed).toBeLessThanOrEqual(cvClip('waiting').speed);
    expect(cvClip('idle').speed).toBeGreaterThan(0);
  });
});
