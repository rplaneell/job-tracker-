import type { ScoutStatus } from '../domain/scouting';

export interface CvDraft {
  id: string;
  title: string;
  company: string;
  status: 'draft' | 'approved';
}

const LABEL: Record<ScoutStatus, string> = {
  idle: 'Idle',
  waiting: 'Waiting for Claude Code',
  working: 'Working with Claude Code',
  completed: 'Finished its latest draft',
  failed: 'Failed',
};
const TONE: Record<ScoutStatus, string> = {
  idle: 'bg-paper text-ink-soft',
  waiting: 'bg-amber-soft/35 text-amber-deep',
  working: 'bg-sky-soft/35 text-sky-deep',
  completed: 'bg-sage-300/45 text-sage-700',
  failed: 'bg-amber-soft/60 text-amber-deep',
};

/**
 * CV Tailor: the real state of the cv agent. The status comes from the newest cv task row. Company and role text is
 * rendered as plain text only.
 */
export function CvPanel({ status, drafts, source, onClose }: { status: ScoutStatus; drafts: CvDraft[]; source: 'live' | 'simulation'; onClose: () => void }) {
  return (
    <aside
      aria-label="CV Tailor"
      className="pointer-events-auto absolute right-4 top-4 bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_50px_rgba(31,42,39,0.18)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage-700">CV Tailor</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">Tailored CV drafts</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status]}`}>{LABEL[status]}</span>
            {source === 'simulation' && <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-soft">Simulation</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close CV Tailor"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white text-lg leading-none text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-sage-500"
        >
          ×
        </button>
      </header>

      <section aria-label="How it works" className="rounded-2xl border border-line bg-white p-3 text-xs leading-snug text-ink-soft">
        <p>
          Press Tailor my CV on a role in the dashboard. Claude Code then writes a draft that only reorders and rewords what is already in your master CV. It cannot add a
          number, an employer or a skill that is not there. You read, approve and print it yourself.
        </p>
      </section>

      <section aria-label="Latest drafts" className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Latest drafts</h3>
        {drafts.length === 0 && <p className="rounded-2xl border border-line bg-white p-3 text-sm text-ink-soft">No drafts yet.</p>}
        {drafts.slice(0, 5).map((d) => (
          <article key={d.id} className="rounded-2xl border border-line bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{d.title}</p>
              <span className={`text-xs font-semibold ${d.status === 'approved' ? 'text-sage-700' : 'text-ink-soft'}`}>{d.status}</span>
            </div>
            <p className="text-xs text-ink-soft">{d.company}</p>
          </article>
        ))}
      </section>

      <a href="/cv" className="rounded-xl border border-line bg-white px-3 py-2 text-center text-sm font-medium text-sage-700 hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-sage-500">Open your CV</a>

      <p className="mt-auto rounded-xl bg-sage-100 px-3 py-2 text-[11px] leading-snug text-sage-700">
        {source === 'simulation'
          ? 'Sample data. Job HQ is not signed in to your database yet, so nothing here is real. Live data arrives with milestone M1.'
          : 'Live from your database. Your CV text never leaves it.'}
      </p>
    </aside>
  );
}
