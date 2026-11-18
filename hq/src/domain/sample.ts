import type { Priority, Stage } from './reception';

/** Sample data for the visual proof only. Milestone M1 replaces this with the real database. */
export const SAMPLE_PRIORITIES: Priority[] = [
  { id: 'p1', kind: 'followUp', title: 'Follow up with Novartis', detail: 'Applied 8 days ago, no reply yet', due: '2026-11-17T09:00:00' },
  { id: 'p2', kind: 'interview', title: 'Case interview practice', detail: 'Healthcare strategy, 45 minutes', due: '2026-11-18T14:00:00' },
  { id: 'p3', kind: 'deadline', title: 'Roche graduate programme', detail: 'Application closes this Friday', due: '2026-11-20T23:00:00' },
  { id: 'p4', kind: 'newJobs', title: '5 new roles fit your profile', detail: 'Basel, Zurich and Copenhagen', due: '2026-11-18T18:00:00' },
];

export const SAMPLE_APPLICATIONS: { stage: Stage }[] = [
  { stage: 'saved' }, { stage: 'saved' }, { stage: 'saved' }, { stage: 'saved' },
  { stage: 'applied' }, { stage: 'applied' }, { stage: 'applied' },
  { stage: 'assessment' },
  { stage: 'interview' },
  { stage: 'rejected' },
];
