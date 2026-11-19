import { CREDITS } from '../data/credits';
import { useHq } from '../state/useHq';

/** CC BY needs the artist credited, the licence named and any changes stated. */
export function Credits() {
  const open = useHq((s) => s.creditsOpen);
  const setOpen = useHq((s) => s.setCreditsOpen);
  if (!open) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 grid place-items-center bg-ink/30 p-4" onClick={() => setOpen(false)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Credits"
        onClick={(e) => e.stopPropagation()}
        className="w-[min(520px,100%)] rounded-3xl border border-white/60 bg-white p-6 shadow-[0_18px_50px_rgba(31,42,39,0.25)]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Credits</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close credits" className="grid h-9 w-9 place-items-center rounded-full border border-line text-lg leading-none text-ink-soft hover:bg-paper">
            ×
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">3D models used under the Creative Commons Attribution 4.0 licence.</p>
        <ul className="mt-4 grid gap-3">
          {CREDITS.map((c) => (
            <li key={c.url} className="rounded-2xl border border-line p-3 text-sm">
              <a className="font-semibold text-sky-deep underline-offset-2 hover:underline" href={c.url} target="_blank" rel="noopener noreferrer">
                {c.title}
              </a>
              <div className="text-ink-soft">by {c.author} · {c.use}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-soft">Changes made: meshes merged, textures resized and compressed, the characters placed in the scene, the sword removed from the goblin, and unused animations removed from the CV Tailor. Licence: creativecommons.org/licenses/by/4.0</p>
      </section>
    </div>
  );
}
