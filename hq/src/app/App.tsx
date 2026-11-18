import { useEffect, useMemo } from 'react';
import { buildReceptionView } from '../domain/reception';
import { SAMPLE_APPLICATIONS, SAMPLE_PRIORITIES } from '../domain/sample';
import { Scene } from '../scene/Scene';
import { useHq } from '../state/useHq';
import { Credits } from '../ui/Credits';
import { ReceptionPanel } from '../ui/ReceptionPanel';

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

  // A link such as ?focus=reception opens that department straight away.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === 'reception') openDepartment('reception');
  }, [openDepartment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && leave();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  return (
    <div className="relative h-full w-full">
      <Scene managerLine={line} corner={cornerFromUrl()} />

      <div className="pointer-events-none absolute inset-0">
        <header className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-sage-700 text-sm font-bold text-white">HQ</span>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Job HQ</div>
            <div className="text-[11px] text-ink-soft">Visual proof · Reception</div>
          </div>
        </header>

        {focus === null && (
          <p className="absolute bottom-4 left-4 max-w-[19rem] rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 text-xs text-ink-soft shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
            Click the Office Manager at the reception desk to open Reception.
          </p>
        )}

        <div className="pointer-events-auto absolute bottom-4 right-4 flex gap-2">
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
      </div>
      <Credits />
    </div>
  );
}
