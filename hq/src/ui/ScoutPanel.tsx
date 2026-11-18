import type { ScoutItem } from '../data/scoutData';
import { STATUS_LABEL, shortlist, type ScoutStatus } from '../domain/scouting';

const STATUS_TONE: Record<ScoutStatus, string> = {
  idle: 'bg-paper text-ink-soft',
  waiting: 'bg-amber-soft/35 text-amber-deep',
  working: 'bg-sky-soft/35 text-sky-deep',
  completed: 'bg-sage-300/45 text-sage-700',
  failed: 'bg-amber-soft/60 text-amber-deep',
};

/**
 * Scouting: the real state of the Scouting agent. The status comes from the newest task row and the list from the
 * agent's own verdicts. Text written by companies or by the agent is rendered as plain text only.
 */
export function ScoutPanel({
  status,
  items,
  source,
  onClose,
}: {
  status: ScoutStatus;
  items: ScoutItem[];
  source: 'live' | 'simulation';
  onClose: () => void;
}) {
  const top = shortlist(items, 5);
  return (
    <aside
      aria-label="Scouting"
      className="pointer-events-auto absolute right-4 top-4 bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_50px_rgba(31,42,39,0.18)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage-700">Scouting</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">New role review</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
            {source === 'simulation' && (
              <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-soft">Simulation</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Scouting"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white text-lg leading-none text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-sage-500"
        >
          ×
        </button>
      </header>

      <section aria-label="Shortlist" className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Shortlist</h3>
        {top.length === 0 && <p className="rounded-2xl border border-line bg-white p-3 text-sm text-ink-soft">Nothing shortlisted yet.</p>}
        {top.map((v) => (
          <article key={v.roleId} className="rounded-2xl border border-line bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{v.title}</p>
              <span className="text-sm font-semibold tabular-nums text-sage-700">{v.score}</span>
            </div>
            <p className="text-xs text-ink-soft">{v.company}</p>
            <p className="mt-1.5 text-xs leading-snug">{v.reason}</p>
          </article>
        ))}
      </section>

      <p className="mt-auto rounded-xl bg-sage-100 px-3 py-2 text-[11px] leading-snug text-sage-700">
        {source === 'simulation'
          ? 'Sample data. Job HQ is not signed in to your database yet, so nothing here is real. Live data arrives with milestone M1.'
          : 'Live from your database. Scouting only reads and scores roles. It sends nothing anywhere.'}
      </p>
    </aside>
  );
}
