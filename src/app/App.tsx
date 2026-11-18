import { Boxes } from 'lucide-react';
import { SceneRoot } from '@/scene/canvas/SceneRoot';

/**
 * Environment smoke screen only. The real Job HQ shell, router and providers
 * are built later. Keep the 3D scene and the conventional UI as separate trees.
 */
export function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Boxes className="size-5 text-sky-400" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Job HQ</h1>
        <span className="text-sm text-slate-400">environment ready</span>
      </header>
      <main className="min-h-0 flex-1">
        <SceneRoot />
      </main>
    </div>
  );
}
