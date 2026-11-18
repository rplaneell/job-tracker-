import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { shortlist } from './scouting';

const verdict = fc.record({
  roleId: fc.uuid(),
  score: fc.integer({ min: 0, max: 100 }),
  reason: fc.string({ minLength: 10, maxLength: 60 }),
  shortlisted: fc.boolean(),
});

describe('shortlist properties', () => {
  it('never returns a verdict below one it left out', () =>
    fc.assert(
      fc.property(fc.array(verdict, { maxLength: 30 }), fc.integer({ min: 0, max: 10 }), (verdicts, limit) => {
        const picked = shortlist(verdicts, limit);
        const left = verdicts.filter((x) => x.shortlisted && !picked.includes(x));
        const lowestPicked = Math.min(...picked.map((p) => p.score), Infinity);
        for (const l of left) expect(l.score).toBeLessThanOrEqual(lowestPicked);
        expect(picked.length).toBeLessThanOrEqual(Math.max(limit, 0));
      }),
    ));
  it('only returns shortlisted verdicts', () =>
    fc.assert(fc.property(fc.array(verdict, { maxLength: 30 }), (verdicts) => {
      for (const p of shortlist(verdicts, 10)) expect(p.shortlisted).toBe(true);
    })));
});
