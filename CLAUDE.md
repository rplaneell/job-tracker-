# Notes for Claude Code

* Preferences: friendly human tone, never use hyphens or dashes in replies and docs prose, always explain abbreviations.

## Secrets rule (applies to every project)

* Keep API keys, tokens and passwords only in a local `.env` file. (API means application programming interface, the door a program uses to talk to another service, and a key is the password for that door.)
* `.env` must always be listed in `.gitignore`. Check this before the first commit, and check that `git ls-files` shows no `.env` file with real secrets.
* Commit a `.env.example` with the variable names and empty values.
* Never paste a key into source code, docs, chat messages, screenshots or commit messages.
* If a key ever reaches GitHub, revoke it at the provider and make a new one. Deleting the commit is not enough.
* The Supabase service role key must never be used in this browser app. Only the project URL and the publishable key (both `VITE_` variables) belong here.

Why: Git remembers everything forever, and bots scan GitHub within seconds for keys. A file Git never sees can never be uploaded by mistake.

## Skills (myskills marketplace)

* This project is linked to the `rplaneell/myskills` marketplace through `.claude/settings.json`. The always on plugins are core, superpowers and task observer (task observer watches the session and suggests small improvements to skills, always with approval).
* Follow the skills announced at session start. Add more groups for this project with `python3 ~/myskills/scripts/link.py . frontend` (swap `frontend` for any group name).
* Project skills in `.claude/skills/` come from `cesartevisual/threejs-skills` (MIT licence, commit 84f9bcb). Installed: threejs-r3f, scene, assets, animation, interaction, lighting, materials, postprocessing, performance, debugging, testing, accessibility. For any 3D work, read threejs-r3f first.

## Project: Job HQ

A 3D isometric headquarters used to manage a job search. Status: environment only, the building itself is not built yet.

### Stack (versions are deliberately pinned to compatible ranges)

React 19.3, TypeScript 6.0 (not 7, because typescript-eslint does not support 7 yet), Vite 8, Three.js 0.187, React Three Fiber 9, drei 10, Tailwind CSS 4, Zustand 5, React Router 7, TanStack Query 5, React Hook Form 7 with Zod 4, date-fns 4, Supabase JS 2, Vitest 5, React Testing Library, Playwright.

Do not bump React past 19.3.x until React Three Fiber's peer range allows it. Do not bump Three.js past 0.187.x until `postprocessing` allows it. Check peer ranges with `npm view <package> peerDependencies` before any upgrade.

### Architecture

```
src/
  app/        App shell, providers, router (wiring only)
  scene/      ALL 3D code. The only place that may import three, @react-three/*, @react-spring/three
    canvas/       Canvas, camera, controls
    departments/  One folder per department room
    characters/   Character components, generated gltfjsx output
    animations/   Reusable animation hooks and clips
    environment/  Building shell, sky, ground
    lighting/     Lights, shadows, environment maps
  ui/         Conventional 2D interface (shadcn/ui in ui/components/ui, layout)
  pages/      Route level screens
  features/   Job management, one folder per feature
    jobs/domain/  Pure types and rules
    jobs/logic/   Pure functions and use cases
    jobs/components/, jobs/hooks/  Feature UI and hooks
  state/      Zustand stores (UI and scene selection state, no 3D objects)
  models/     Data models and Zod schemas shared by everything
  services/   Supabase and any outside access
  hooks/      Shared React hooks
  lib/        Small utilities (cn, env)
tests/        Test setup. Unit tests sit beside their code as *.test.ts(x)
e2e/          Playwright browser tests
public/assets/  Runtime assets: characters, buildings, furniture, decorations, textures, environments, animations, ui
assets-src/     Source and raw files before optimisation (not served)
docs/           DEPENDENCIES.md and ASSETS.md
```

### Rules

* Business logic stays independent of Three.js. ESLint enforces this: `src/models`, `services`, `state`, `lib`, `hooks` and `features/*/domain|logic` cannot import Three.js, and `src/ui` and `src/pages` cannot either. The 3D scene reads state from Zustand stores and never owns business data.
* Keep the 3D scene and the conventional interface as separate trees. HTML controls must exist for every important 3D action (accessibility and tests).
* Primary animation library: `@react-spring/three` for state driven 3D motion, plus drei helpers (`useAnimations`, `CameraControls`) for clips and camera moves. GSAP is not installed. Add it only if a complex timeline cannot be done otherwise, and say why.
* Use refs and `useFrame` for per frame motion, never React state.
* Import with the `@/` alias (maps to `src/`).
* Assets: check the licence before adding any model, texture or sound, and record it in `assets-src/LICENSES.md`. See `docs/ASSETS.md`.
* Env variables go through `src/lib/env.ts` (Zod validated). Only `VITE_` names reach the browser.
* TypeScript is strict with `noUncheckedIndexedAccess`. Fix types, do not silence them.
* Write a failing test first for logic (superpowers test driven development), then the code.

### Commands

`npm run dev`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format`, `npm run test`, `npm run e2e` (needs `npm run e2e:install` once, or `PW_CHROMIUM_PATH`), and `npm run check` before any commit.

### Known follow ups

* The production bundle is about 1.1 MB because Three.js is large. When the real scene exists, lazy load `SceneRoot` with `React.lazy` so the 2D interface loads first.
* Optional packages not installed yet: see `docs/DEPENDENCIES.md`.
