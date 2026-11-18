export const STAGES = ["saved", "applied", "assessment", "interview", "offer", "rejected"] as const;
export type Stage = (typeof STAGES)[number];

export type ApplicationRow = {
  role_id: string;
  stage: string;
  notes: string;
  assessment_type: string | null;
  applied_at: string | null;
};

export function groupByStage<T extends { stage: string }>(apps: T[]): Record<Stage, T[]> {
  const groups = Object.fromEntries(STAGES.map((s) => [s, [] as T[]])) as Record<Stage, T[]>;
  for (const app of apps) {
    if ((STAGES as readonly string[]).includes(app.stage)) groups[app.stage as Stage].push(app);
  }
  return groups;
}

export function canMove(from: Stage, to: Stage): boolean {
  return from !== to;
}
