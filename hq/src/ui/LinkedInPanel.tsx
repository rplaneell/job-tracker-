import type { LinkedInAlert } from '../data/officeData';
import { LINKEDIN_LABEL, type IntakeCounts, type LinkedInStatus } from '../domain/linkedin';

const MAX_SHOWN = 12;
const TONE: Record<LinkedInStatus, string> = {
  idle: 'bg-paper text-ink-soft',
  completed: 'bg-sky-soft/35 text-sky-deep',
};

/** Best scored first, then the newest. Roles Scouting has not judged yet come after the judged ones. */
function ranked(alerts: LinkedInAlert[]): LinkedInAlert[] {
  return [...alerts]
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.firstSeen.localeCompare(a.firstSeen))
    .slice(0, MAX_SHOWN);
}

/**
 * The LinkedIn desk: the jobs that came from the owner's own LinkedIn alert emails, each with a link to its LinkedIn posting.
 * Company, title and place are text from emails and are rendered as plain text only. A link is shown only when it is a plain
 * LinkedIn job page (checked when the data is read).
 */
export function LinkedInPanel({
  status,
  alerts,
  intake,
  source,
  onClose,
}: {
  status: LinkedInStatus;
  alerts: LinkedInAlert[];
  intake: (IntakeCounts & { at: string }) | null;
  source: 'live' | 'simulation' | 'none';
  onClose: () => void;
}) {
  const shown = ranked(alerts);
  return (
    <aside
      aria-label="LinkedIn desk"
      className="pointer-events-auto absolute right-4 top-4 bottom-4 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-4 overflow-y-auto rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_18px_50px_rgba(31,42,39,0.18)] backdrop-blur-xl"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sage-700">LinkedIn</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">Alert jobs</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[status]}`}>{LINKEDIN_LABEL[status]}</span>
            {source === 'simulation' && (
              <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-soft">Simulation</span>
            )}
          </div>
          {intake && (
            <p className="mt-2 text-xs text-ink-soft">
              Last run: {intake.received} jobs found, {intake.storedNew} new, {intake.queued} sent to Scouting.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the LinkedIn desk"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-white text-lg leading-none text-ink-soft hover:bg-paper focus-visible:outline-2 focus-visible:outline-sage-500"
        >
          ×
        </button>
      </header>

      <section aria-label="Alert jobs" className="grid gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">This week</h3>
        {shown.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-3 text-sm text-ink-soft">
            No LinkedIn alert jobs yet. They arrive when your LinkedIn alert emails are collected, and every one is stored with a link to its posting.
          </p>
        )}
        {shown.map((a) => (
          <article key={a.id} className="rounded-2xl border border-line bg-white p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold leading-snug">{a.title}</p>
              {a.score !== null && <span className="text-sm font-semibold tabular-nums text-sage-700">{a.score}</span>}
            </div>
            <p className="text-xs text-ink-soft">{[a.company, a.city].filter(Boolean).join(', ')}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              {a.shortlisted && <span className="rounded-full bg-sage-300/45 px-2 py-0.5 font-semibold text-sage-700">Shortlisted</span>}
              {a.score === null && <span className="text-ink-soft">Not judged yet</span>}
              {a.href && (
                <a href={a.href} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-deep underline decoration-sky-deep/40 underline-offset-2 hover:decoration-sky-deep">
                  Open the posting
                </a>
              )}
            </div>
          </article>
        ))}
      </section>

      <a
        href="/roles"
        className="rounded-xl border border-line bg-white px-3 py-2 text-center text-sm font-medium text-sage-700 hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-sage-500"
      >
        See all roles, including these
      </a>

      <p className="mt-auto rounded-xl bg-sage-100 px-3 py-2 text-[11px] leading-snug text-sage-700">
        {source === 'simulation'
          ? 'Sample data, shown because the office is running without your dashboard. Nothing here is real.'
          : source === 'none'
            ? 'Nothing is shown because your data could not be read.'
            : 'Live from your database. Alert jobs come from your own LinkedIn alert emails. Nothing here contacts LinkedIn.'}
      </p>
    </aside>
  );
}
