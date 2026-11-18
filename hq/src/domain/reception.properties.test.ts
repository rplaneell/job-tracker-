import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { STAGES, buildReceptionView, overdueCount, rankPriorities, stageCounts, type Priority } from './reception';

const kind = fc.constantFrom('interview', 'deadline', 'followUp', 'newJobs') as fc.Arbitrary<Priority['kind']>;
// Dates as ISO text, sometimes unreadable on purpose.
const due = fc.oneof(
  fc.date({ min: new Date('2026-01-01'), max: new Date('2027-12-31'), noInvalidDate: true }).map((d) => d.toISOString()),
  fc.string({ maxLength: 12 }),
);
const priority = fc.record({ id: fc.uuid(), kind, title: fc.string(), detail: fc.string(), due });
const list = fc.array(priority, { maxLength: 30 });
const now = new Date('2026-11-18T10:00:00Z');

describe('rankPriorities properties', () => {
  it('returns the same items, only reordered, and never changes its input', () => {
    fc.assert(
      fc.property(list, (items) => {
        const copy = JSON.stringify(items);
        const ranked = rankPriorities(items, now);
        expect(JSON.stringify(items)).toBe(copy);
        expect(ranked.map((p) => p.id).sort()).toEqual(items.map((p) => p.id).sort());
      }),
    );
  });
  it('is stable when applied twice', () => {
    fc.assert(fc.property(list, (items) => {
      const once = rankPriorities(items, now);
      expect(rankPriorities(once, now)).toEqual(once);
    }));
  });
  it('puts every overdue item before every item that is not overdue', () => {
    fc.assert(
      fc.property(list, (items) => {
        const ranked = rankPriorities(items, now);
        const n = overdueCount(items, now);
        const isOverdue = (p: Priority) => new Date(p.due).getTime() < now.getTime();
        expect(ranked.slice(0, n).every(isOverdue)).toBe(true);
        expect(ranked.slice(n).some(isOverdue)).toBe(false);
      }),
    );
  });
});

describe('stageCounts and the reception view properties', () => {
  const stage = fc.constantFrom(...STAGES);
  it('counts every known stage exactly once in total', () => {
    fc.assert(fc.property(fc.array(fc.record({ stage }), { maxLength: 60 }), (apps) => {
      const counts = stageCounts(apps);
      expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(apps.length);
    }));
  });
  it('never invents roles in play: active is the total minus rejected, and never negative', () => {
    fc.assert(fc.property(list, fc.array(fc.record({ stage }), { maxLength: 60 }), (items, apps) => {
      const v = buildReceptionView(items, apps, now);
      expect(v.active).toBe(apps.length - v.counts.rejected);
      expect(v.active).toBeGreaterThanOrEqual(0);
      expect(v.top.length).toBeLessThanOrEqual(3);
      expect(v.overdue).toBeLessThanOrEqual(items.length);
    }));
  });
});
