# Job HQ

A premium, interactive 3D job search manager built around a miniature isometric corporate headquarters. Each department of the building will represent a stage of your job search.

**Status:** the development environment is ready. The headquarters, rooms and characters are not built yet. The app currently shows a small smoke test scene (a blue cube) that proves the 3D stack works.

## What you need first

* Node.js 22.12 or newer (check with `node -v`). Node is the program that runs JavaScript tools outside the browser.
* npm 10 or newer (it comes with Node).
* Git.

## Setup

```bash
npm install
```

```bash
cp .env.example .env
```

The `.env` file is for secrets and stays on your computer only (Git ignores it). It can stay empty for now because Supabase is not connected yet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the development server at http://localhost:5173 |
| `npm run build` | Type checks, then makes the production build in `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run typecheck` | Runs the TypeScript checker only |
| `npm run lint` | Runs ESLint (finds code mistakes and rule breaks) |
| `npm run format` | Rewrites files with Prettier (the code formatter) |
| `npm run test` | Runs unit tests once with Vitest |
| `npm run test:watch` | Re runs unit tests as you edit |
| `npm run test:coverage` | Unit tests plus a coverage report |
| `npm run e2e:install` | Downloads the Chromium browser for Playwright (once) |
| `npm run e2e` | Runs the end to end browser tests (builds the app first) |
| `npm run check` | Typecheck, lint, format check, tests and build in one go |
| `npm run gltf -- model.glb` | Converts a GLB model into a React component with gltfjsx |
| `npm run assets:optimize -- in.glb out.glb` | Compresses a model with glTF Transform |

If Playwright cannot download a browser (for example behind a firewall), point it at a Chromium you already have: `PW_CHROMIUM_PATH=/path/to/chromium npm run e2e`.

## Where things live

See `CLAUDE.md` for the architecture and the rules, `docs/DEPENDENCIES.md` for what each package does, and `docs/ASSETS.md` for the 3D model workflow and licence checklist.

## Supabase later

The Supabase client is installed and wired in `src/services/supabase.ts`, but nothing connects until you add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env`. No database has been created.
