import { OFFICE_LINKS } from '../data/links';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadOffice, type OfficeData } from '../data/officeData';
import { buildOfficeState, type OfficeMode } from '../domain/officeState';
import { parseSimStatus, scoutStatus } from '../domain/scouting';
import { KEY_STEP, yawFromDrag } from '../scene/rotation';
import { Scene } from '../scene/Scene';
import { useHq } from '../state/useHq';
import { Credits } from '../ui/Credits';
import { CvPanel } from '../ui/CvPanel';
import { ReceptionPanel } from '../ui/ReceptionPanel';
import { Intro } from '../ui/Intro';
import { LinkedInPanel } from '../ui/LinkedInPanel';
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
  const chromeOn = useHq((s) => s.chromeOn);
  const openDepartment = useHq((s) => s.openDepartment);
  const rotateBy = useHq((s) => s.rotateBy);
  const resetView = useHq((s) => s.resetView);
  const root = useRef<HTMLDivElement>(null);
  const now = useMemo(() => new Date(), []);
  // The office reads the owner's real data through the dashboard. Run on its own (no dashboard, for example while
  // developing) it shows sample data that is labelled Simulation. Inside the dashboard it never shows invented data.
  const [mode, setMode] = useState<OfficeMode>('loading');
  const [data, setData] = useState<OfficeData | null>(null);
  useEffect(() => {
    const standalone = import.meta.env.BASE_URL === '/';
    let cancelled = false;
    const read = async () => {
      const result = await loadOffice();
      if (cancelled) return;
      setData(result);
      setMode(result ? 'live' : standalone ? 'sample' : 'unavailable');
    };
    void read();
    const timer = window.setInterval(read, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  const state = useMemo(() => buildOfficeState(mode, data, now), [mode, data, now]);
  const { view, line } = state;
  const scout = useMemo(() => parseSimStatus(window.location.search) ?? scoutStatus(state.scoutTasks, data?.now ?? now), [state.scoutTasks, data, now]);
  const cv = useMemo(() => parseSimStatus(window.location.search, 'simcv') ?? scoutStatus(state.cvTasks, data?.now ?? now), [state.cvTasks, data, now]);

  // A link such as ?focus=reception opens that department straight away.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('focus');
    if (wanted === 'reception' || wanted === 'scouting' || wanted === 'cv' || wanted === 'linkedin') openDepartment(wanted);
  }, [openDepartment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave();
      else if (e.key === 'ArrowLeft') rotateBy(-KEY_STEP);
      else if (e.key === 'ArrowRight') rotateBy(KEY_STEP);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave, rotateBy]);

  // Drag sideways on the office to turn it, all the way round. Works with a mouse, a finger or a pen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let lastX: number | null = null;
    let id = -1;
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement) || !e.isPrimary) return;
      lastX = e.clientX;
      id = e.pointerId;
    };
    const move = (e: PointerEvent) => {
      if (lastX === null || e.pointerId !== id) return;
      rotateBy(yawFromDrag(e.clientX - lastX));
      lastX = e.clientX;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === id) lastX = null;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [rotateBy]);

  return (
    <div ref={root} className="relative h-full w-full">
      <Scene managerLine={line} corner={cornerFromUrl()} scoutStatus={scout} cvStatus={cv} deskStatus={state.deskStatus} simulated={state.simulated} />

      <div className={`chrome pointer-events-none absolute inset-0 ${chromeOn ? '' : 'chrome-off'}`}>
        <header className="pointer-events-auto absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
          <img src="/brand/the-climb-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-xl" />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">the climb</div>
            <div className="text-[11px] text-ink-soft">Your job search office</div>
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

        {state.notice && (
          <p role="status" className="pointer-events-auto absolute left-4 top-20 max-w-[19rem] rounded-2xl border border-amber-soft bg-white/90 px-4 py-2.5 text-xs text-amber-deep shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
            {state.notice}
          </p>
        )}

        {focus === null && (
          <p className="absolute bottom-4 left-4 max-w-[19rem] rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 text-xs text-ink-soft shadow-[0_8px_30px_rgba(31,42,39,0.12)] backdrop-blur-xl">
            Drag to turn the office all the way round. Click the Office Manager at the reception desk to open Reception.
          </p>
        )}

        <div className="pointer-events-auto absolute bottom-4 right-4 flex flex-wrap justify-end gap-2">
          <button type="button" aria-label="Turn the office left" onClick={() => rotateBy(-KEY_STEP)} className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500">
            ⟲
          </button>
          <button type="button" aria-label="Turn the office right" onClick={() => rotateBy(KEY_STEP)} className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500">
            ⟳
          </button>
          <button type="button" onClick={resetView} className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500">
            Reset view
          </button>
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
            onClick={() => openDepartment('linkedin')}
            className="rounded-full border border-white/60 bg-white/80 px-3.5 py-1.5 text-xs font-medium text-ink-soft shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-sage-500"
          >
            LinkedIn
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

        {focus === 'reception' && <ReceptionPanel view={view} now={data?.now ?? now} source={state.source} />}
        {focus === 'cv' && <CvPanel status={cv} drafts={state.cvDrafts} source={state.source} onClose={leave} />}
        {focus === 'linkedin' && <LinkedInPanel status={state.deskStatus} alerts={state.alerts} intake={state.lastIntake} source={state.source} onClose={leave} />}
        {focus === 'scouting' && <ScoutPanel status={scout} items={state.scoutItems} source={state.source} onClose={leave} />}
      </div>
      <Credits />
      <Intro />
    </div>
  );
}
