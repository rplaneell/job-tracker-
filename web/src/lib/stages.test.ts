import { describe, expect, it } from "vitest";
import { STAGES, canMove, groupByStage, journeyStages, type ApplicationRow } from "./stages";

const app = (role_id: string, stage: string): ApplicationRow => ({ role_id, stage, notes: "", assessment_type: null, applied_at: null });

describe("stages", () => {
  it("groupByStage returns every stage key even when empty", () => {
    const g = groupByStage([]);
    expect(Object.keys(g)).toEqual([...STAGES]);
    expect(g.offer).toEqual([]);
  });
  it("groupByStage puts unknown stages nowhere and does not throw", () => {
    const g = groupByStage([app("1", "saved"), app("2", "mystery")]);
    expect(g.saved.map((a) => a.role_id)).toEqual(["1"]);
    expect(Object.values(g).flat()).toHaveLength(1);
  });
  it("canMove rejects same stage", () => {
    expect(canMove("saved", "saved")).toBe(false);
    expect(canMove("saved", "applied")).toBe(true);
  });
});

describe("journeyStages", () => {
  it("is the forward path from saved to offer, without rejected", () => {
    expect(journeyStages()).toEqual(["saved", "applied", "assessment", "interview", "offer"]);
  });
  it("only uses real stages", () => {
    for (const s of journeyStages()) expect(STAGES).toContain(s);
  });
});
