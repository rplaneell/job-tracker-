# Dependency summary

All versions were checked against each other's peer dependency ranges before install. `npm ls` reports a clean tree and `npm audit --omit=dev` reports zero vulnerabilities in what ships to users.

## Core

| Package | Purpose |
| --- | --- |
| react, react-dom (19.3) | The user interface library |
| typescript (6.0) | Typed JavaScript. Held at 6.0 because typescript-eslint does not yet support 7 |
| vite (8) and @vitejs/plugin-react | The dev server and production bundler |
| three (0.187) and @types/three | The 3D engine and its type definitions |
| @react-three/fiber (9) | Lets you write Three.js scenes as React components |
| @react-three/drei (10) | Ready made helpers: controls, loaders, environments, text, animation hooks |
| zustand (5) | Small state store, used to link the 2D interface and the 3D scene |
| react-router (7) | Page routing (version 7 ships everything in this one package) |
| tailwindcss (4) and @tailwindcss/vite | Utility class styling |
| lucide-react | Icon set |

## 3D extras

| Package | Purpose |
| --- | --- |
| @react-three/postprocessing | Visual effects such as bloom, depth of field and ambient occlusion |
| @react-spring/three | **Primary animation library.** Spring physics motion driven by state, made for R3F |
| gltfjsx (dev) | Turns a GLB/GLTF model into a typed React component |
| @gltf-transform/cli (dev) | Command line model optimiser: compression, texture resizing, deduplication |

### Which animation library?

Use `@react-spring/three` for almost everything (hover lifts, doors, camera focus, UI driven changes). Use drei's `useAnimations` for baked character clips from GLB files. These two cover the project without overlap.

## Interface and data

| Package | Purpose |
| --- | --- |
| shadcn/ui (config in components.json) | Not a dependency. A command line tool that copies accessible component code into `src/ui/components/ui`. Add components on demand with `npx shadcn@latest add button` |
| class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot | The small helpers shadcn components rely on |
| react-hook-form and @hookform/resolvers | Forms, with Zod validation plugged in |
| zod (4) | Describes and validates data shapes (forms, env, API data) |
| date-fns (4) | Date maths and formatting |
| @tanstack/react-query (5) | Caching and loading state for server data. Installed now because Supabase queries will need it. Not yet wired in |

## Backend preparation

| Need | Package |
| --- | --- |
| Authentication, PostgreSQL queries, file storage, realtime | `@supabase/supabase-js` (one package covers all four) |

No project, database or credentials exist. See `.env.example`. Later, install the Supabase command line tool (outside npm) for migrations and generating database types.

## Quality tools

| Package | Purpose |
| --- | --- |
| eslint, typescript-eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, eslint-config-prettier | Code rule checking, including the rule that keeps Three.js out of business logic |
| prettier | Automatic formatting |
| vitest, @vitest/coverage-v8, jsdom | Unit test runner, coverage and a fake browser |
| @testing-library/react, dom, jest-dom, user-event | Test components the way a user uses them |
| @playwright/test | Real browser end to end tests |

## Deliberately NOT installed

| Package | Why not |
| --- | --- |
| gsap | Overlaps with react-spring. Add later only for a complex multi step timeline |
| @react-three/rapier | Physics (WebAssembly, heavy). An office dashboard does not need collisions yet. Matching skill not installed either |
| three-stdlib | drei already depends on it, so a direct install adds nothing |
| react-router-dom | Version 7 merged it into `react-router` |
| Husky or lint staged | Git hooks are easy to add later and not needed to start |

## Tools to install yourself

* Node.js 22.12 or newer.
* Playwright browser: `npm run e2e:install` (downloads Chromium).
* Later, for Supabase: the Supabase CLI and a free Supabase account.
* Optional: Blender (free) for editing models, and a glTF viewer such as https://gltf.report.
