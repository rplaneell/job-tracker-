import type { LinkedInAlert } from '../data/officeData';
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

/** Simulation only: what the Scouting panel looks like after one finished review. Never shown as real. */
export const SAMPLE_SCOUT_TASKS = [
  { id: 's1', status: 'done' as const, claimedAt: '2026-11-18T06:10:00Z', createdAt: '2026-11-18T06:00:00Z', finishedAt: '2026-11-18T06:40:00Z' },
];
export const SAMPLE_SCOUT_ITEMS = [
  { roleId: 'a', score: 91, reason: 'Junior consulting role in Zurich, no experience asked, fits the dual degree.', shortlisted: true, title: 'Business Analyst, Life Sciences', company: 'Example Advisory' },
  { roleId: 'b', score: 84, reason: 'Venture fund associate in Basel, health focus, graduate friendly.', shortlisted: true, title: 'Investment Analyst Intern', company: 'Example Ventures' },
  { roleId: 'c', score: 77, reason: 'Bioprocess strategy analyst in Copenhagen, matches the lab background.', shortlisted: true, title: 'Strategy Analyst, Biotech', company: 'Example Partners' },
];

/** Simulation only: a finished tailoring run and two drafts. Never shown as real. */
export const SAMPLE_CV_TASKS = [
  { id: 'c1', status: 'done' as const, claimedAt: '2026-11-18T09:10:00Z', createdAt: '2026-11-18T09:00:00Z', finishedAt: '2026-11-18T09:25:00Z' },
];
export const SAMPLE_CV_DRAFTS = [
  { id: 'd1', title: 'Business Analyst, Life Sciences', company: 'Example Advisory', status: 'draft' as const },
  { id: 'd2', title: 'Investment Analyst Intern', company: 'Example Ventures', status: 'approved' as const },
];

/** Simulation only: three LinkedIn alert roles. Never shown as real. */
export const SAMPLE_ALERTS: LinkedInAlert[] = [
  { id: 'l1', title: 'Healthcare Strategy Analyst', company: 'Example Advisory', city: 'Barcelona', href: null, fits: true, score: 84, shortlisted: true, firstSeen: '2026-11-18T07:40:00Z' },
  { id: 'l2', title: 'Pharma Market Access Intern', company: 'Example Pharma', city: 'Barcelona', href: null, fits: true, score: 71, shortlisted: true, firstSeen: '2026-11-18T07:40:00Z' },
  { id: 'l3', title: 'Business Development Trainee', company: 'Example Medtech', city: 'Barcelona', href: null, fits: true, score: null, shortlisted: false, firstSeen: '2026-11-18T07:40:00Z' },
];
