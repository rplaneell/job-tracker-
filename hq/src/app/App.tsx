import { OFFICE_LINKS } from '../data/links';
import { useEffect, useMemo } from 'react';
import { buildReceptionView } from '../domain/reception';
import { SAMPLE_APPLICATIONS, SAMPLE_CV_DRAFTS, SAMPLE_CV_TASKS, SAMPLE_PRIORITIES, SAMPLE_SCOUT_ITEMS, SAMPLE_SCOUT_TASKS } from '../domain/sample';
import { parseSimStatus, scoutStatus } from '../domain/scouting';
import { Scene } from '../scene/Scene';
import { useHq } from '../state/useHq';
import { Credits } from '../ui/Credits';
import { CvPanel } from '../ui/CvPanel';
import { ReceptionPanel } from '../ui/ReceptionPanel';
import { ScoutPanel } from '../ui/ScoutPanel';

/** Optional ?corner=0..3 picks which side of the office the camera looks from. */
function cornerFromUrl(): number {
  const n = Number(new URLSearchParams(window.location.search).get('corner'));
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
}

export function App() {
  const focus = useHq((s) => s.focus);
  const leave = useHq((s) => s.leave);
  const lowPower = useHq((s) => s.lowPower);
  const setLowPower = useHq((s) => s.setLowPower);
  const setCreditsOpen = useHq((s) => s.setCreditsOpen);
  const openDepartment = useHq((s) => s.openDepartment);
  const now = useMemo(() => new Date(), []);
  const view = useMemo(() => buildReceptionView(SAMPLE_PRIORITIES, SAMPLE_APPLICATIONS, now), [now]);
  const line = `${view.greeting}. ${view.headline}`;
  // Simulation until milestone M1 signs HQ in to the database. The panel says so on screen.
  const scout = useMemo(() => parseSimStatus(window.location.search) ?? scoutStatus(SAMPLE_SCOUT_TASKS, now), [now]);
  const cv = useMemo(() => parseSimStatus(window.location.search, 'simcv') ?? scoutStatus(SAMPLE_CV_TASKS, now), [now]);

  // A link such as ?focus=reception opens that department straight away.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('focus');
    if (wanted === 'reception' || wanted === 'scouting' || wanted === 'cv') openDepartment(wanted);
  }, [openDepartment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  return (
    <div className="relative h-full w-full">
      <Scene managerLine={line} corner={cornerFromUrl()} scoutStatus={scout} cvStatus={cv} simulated />

      <div className="pointer-events-none absolute inset-0">
        <header className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
          <img src="/brand/the-climb-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">the climb</div>
            <div className="text-[11px] text-ink-soft">Visual proof · Reception</div>
          </div>
        </header>

        <nav aria-label="The rest of the app" className="pointer-events-auto absolute right-4 top-4 flex flex-wrap justify-end gap-2">
          {OFFICE_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {focus === null && (
          <p className="absolute bottom-4 left-4 max-w-[19rem] rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 text-xs text-ink-soft shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
            Click the Office Manager at the reception desk to open Reception.
          </p>
        )}

        <div className="pointer-events-auto absolute bottom-4 right-4 flex gap-2">
          <button
            type="button"
            onClick={() => openDepartment('scouting')}
            className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
          >
            Scouting
          </button>
          <button
            type="button"
            onClick={() => openDepartment('cv')}
            className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
          >
            CV Tailor
          </button>
          <button
            type="button"
            onClick={() => setLowPower(!lowPower)}
            aria-pressed={lowPower}
            className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
          >
            Low power {lowPower ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
            className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
          >
            Credits
          </button>
        </div>

        {focus === 'reception' && <ReceptionPanel view={view} now={now} />}
        {focus === 'cv' && <CvPanel status={cv} drafts={SAMPLE_CV_DRAFTS} source="simulation" onClose={leave} />}
        {focus === 'scouting' && <ScoutPanel status={scout} items={SAMPLE_SCOUT_ITEMS} source="simulation" onClose={leave} />}
      </div>
      <Credits />
    </div>
  );
}
