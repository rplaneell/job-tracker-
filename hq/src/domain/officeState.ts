import type { OfficeData } from '../data/officeData';
import type { ScoutItem } from '../data/scoutData';
import type { CvDraft } from '../ui/CvPanel';
import { buildReceptionView, type Priority, type ReceptionView, type Stage } from './reception';
import { SAMPLE_APPLICATIONS, SAMPLE_CV_DRAFTS, SAMPLE_CV_TASKS, SAMPLE_PRIORITIES, SAMPLE_SCOUT_ITEMS, SAMPLE_SCOUT_TASKS } from './sample';
import type { AgentTask } from './scouting';

/** loading: asked and waiting. live: real data read. unavailable: could not be read. sample: running on its own without the dashboard. */
export type OfficeMode = 'loading' | 'live' | 'unavailable' | 'sample';

export interface OfficeState {
  line: string;
  view: ReceptionView;
  scoutTasks: AgentTask[];
  cvTasks: AgentTask[];
  scoutItems: ScoutItem[];
  cvDrafts: CvDraft[];
  /** True only for sample data, so its labels show. Real data and empty states carry no label. */
  simulated: boolean;
  /** live: real data. simulation: labelled sample data. none: there is nothing to show, because nothing was read. */
  source: 'live' | 'simulation' | 'none';
  /** A plain sentence for the screen when something is wrong, otherwise null. */
  notice: string | null;
}

/** Decides what the office shows. Sample content can only appear in sample mode, never next to real or missing data. */
export function buildOfficeState(mode: OfficeMode, data: OfficeData | null, now: Date): OfficeState {
  const empty = { scoutTasks: [] as AgentTask[], cvTasks: [] as AgentTask[], scoutItems: [] as ScoutItem[], cvDrafts: [] as CvDraft[] };
  let priorities: Priority[] = [];
  let applications: { stage: Stage }[] = [];
  let content = empty;
  let when = now;
  if (mode === 'live' && data) {
    priorities = data.priorities;
    applications = data.applications;
    when = data.now;
    content = { scoutTasks: data.scoutTasks, cvTasks: data.cvTasks, scoutItems: data.scoutItems, cvDrafts: data.cvDrafts };
  } else if (mode === 'sample') {
    priorities = SAMPLE_PRIORITIES;
    applications = SAMPLE_APPLICATIONS;
    content = { scoutTasks: SAMPLE_SCOUT_TASKS, cvTasks: SAMPLE_CV_TASKS, scoutItems: SAMPLE_SCOUT_ITEMS, cvDrafts: SAMPLE_CV_DRAFTS };
  }
  let view = buildReceptionView(priorities, applications, when);
  let line = `${view.greeting}. ${view.headline}`;
  let notice: string | null = null;
  const unread = mode === 'unavailable' || (mode === 'live' && !data);
  if (mode === 'loading') {
    line = 'One moment, I am reading your data.';
    view = { ...view, headline: 'Reading your data.' };
  }
  if (unread) {
    line = 'I could not read your data.';
    view = { ...view, headline: 'I could not read your data.' };
    notice = 'The office could not read your data. Sign in again or try later.';
  }
  const source = mode === 'sample' ? 'simulation' : mode === 'loading' || unread ? 'none' : 'live';
  return { line, view, ...content, simulated: mode === 'sample', source, notice };
}
