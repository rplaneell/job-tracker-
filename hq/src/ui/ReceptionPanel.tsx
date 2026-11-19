import type { ReceptionView } from '../domain/reception';
import { STAGES } from '../domain/reception';
import { useHq } from '../state/useHq';

const KIND_LABEL = { interview: 'Interview', deadline: 'Deadline', followUp: 'Follow up', newJobs: 'New roles' } as const;
const KIND_TONE = {
  interview: 'bg-sky-soft/35 text-sky-deep',
  deadline: 'bg-amber-soft/35 text-amber-deep',
  followUp: 'bg-sage-300/45 text-sage-700',
  newJobs: 'bg-sage-100 text-sage-700',
} as const;

function dueText(due: string, now: Date): string {
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return 'No date';
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (d < now && !sameDay) return 'Overdue';
  return sameDay ? `Today ${time}` : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Reception: today at a glance. Real data from the database, or labelled sample data when the office runs on its own. */
export function ReceptionPanel({ view, now, source }: { view: ReceptionView; now: Date; source: 'live' | 'simulation' | 'none' }) {
  const leave = useHq((s) => s.leave);
  return (
    <aside
      aria-label="Reception"
      className="pointer-events-auto absolute right-4 top-4 bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_50px_rgba(31,42,39,0.18)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage-700">Reception</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{view.greeting}</h2>
          <p className="mt-1 text-sm text-ink-soft">{view.headline}</p>
        </div>
        <button
          type="button"
          onClick={leave}
          aria-label="Close Reception"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white text-lg leading-none text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-sage-500"
        >
          ×
        </button>
      </header>

      <section aria-label="Today's priorities" className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Today's priorities</h3>
        {view.top.map((p) => (
          <article key={p.id} className="rounded-2xl border border-line bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_TONE[p.kind]}`}>{KIND_LABEL[p.kind]}</span>
              <span className={`text-xs ${dueText(p.due, now) === 'Overdue' ? 'font-semibold text-amber-deep' : 'text-ink-soft'}`}>{dueText(p.due, now)}</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold leading-snug">{p.title}</p>
            <p className="text-xs text-ink-soft">{p.detail}</p>
          </article>
        ))}
      </section>

      <section aria-label="Pipeline" className="grid gap-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Pipeline</h3>
          <span className="text-xs text-ink-soft">{view.active} in play</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STAGES.map((s) => (
            <div key={s} className="rounded-2xl border border-line bg-white px-3 py-2">
              <div className="text-xl font-semibold tabular-nums">{view.counts[s]}</div>
              <div className="text-[11px] capitalize text-ink-soft">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-auto rounded-xl bg-sage-100 px-3 py-2 text-[11px] leading-snug text-sage-700">
        {source === 'simulation'
          ? 'Sample data for the visual proof, shown because the office is running without your dashboard.'
          : source === 'none'
            ? 'Nothing is shown because your data could not be read.'
            : 'Live from your database. Follow ups appear when an application has had no news for 7 days.'}
      </p>
    </aside>
  );
}
