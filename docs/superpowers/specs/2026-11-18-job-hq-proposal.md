# Job HQ proposal (for approval, nothing built yet)

Date: 2026-11-18. Status: waiting for the owner's approval.

## What I inspected

The project already has a Python collector, a Supabase database (tables `roles`, `applications`, `source_runs`) and a Next.js dashboard. Job HQ becomes a new front end on the same database, so every job the collector finds appears in the Research Department from day one.

## 1. Architecture

- One Vite, React and TypeScript single page app in `hq/`. It replaces the Next.js dashboard once Job HQ matches its features (roles, pipeline, sources). Reason: React Three Fiber only runs in the browser, so Next.js adds nothing, and Supabase sign in works from the browser.
- Layers that depend in one direction only: domain, then data, then state, then scene and ui.
  - **domain**: types, status rules, scoring, dates. Pure functions with tests.
  - **data**: repository interfaces with two adapters, Supabase (real) and local browser storage (offline and tests). Zod checks everything that comes in.
  - **state**: Zustand stores per area, plus one event bus.
  - **scene**: the 3D office. It never imports data or state. It receives plain view models as props and sends back intents such as "open department" or "talk to character".
  - **ui**: Tailwind panels and forms for all detail work.
- The event bus carries domain events (applicationSubmitted, interviewScheduled, offerReceived, reminderDue). One file maps events to character reactions, so animation rules never leak into business logic.
- Accessibility: every department is also reachable from a plain keyboard friendly menu. A low power switch turns off animation and shadows.

## 2. Folder structure

```
hq/
  src/
    domain/      types, rules, pure logic (tested)
    data/        repositories: supabase and local
    state/       zustand stores, selectors, event bus
    scene/       Canvas, Building, departments/, characters/, camera/, lighting/, props/
    ui/          one panel folder per department, forms, shared components
    app/         routing, shell, sign in, settings
  public/models/ glTF files and LICENSES.md (source, licence, attribution)
supabase/migrations/   existing plus new tables
collector/             existing, unchanged
```

## 3. Main data models

Existing: **Job** (the `roles` table), **Application**, **SourceRun**.

New:
- **Company**: name, website, notes, research notes, culture and salary notes, rating.
- **Application** (extended): job, company, stage, applied date, CV version, cover letter version, source, next action and due date, plus a **StageEvent** history.
- **Document**: kind (CV or cover letter), name, versions with file, date and notes about what changed.
- **Interview**: application, kind, date and time, people, prep checklist, outcome.
- **QuestionBank**: question, type (case, numerical, behavioural, technical), my answer, strength rating.
- **Feedback**: interview, what went well, what to improve, scores.
- **Contact**: name, role, company, channel details. **Interaction**: contact, date, summary, follow up needed.
- **Reminder**: what, due date, linked item, done.
- **Offer**: application, salary, bonus, benefits, deadline, notes, negotiation steps.
- **Skill**: name, level, target level, evidence. **Course**: title, provider, status, link to skill.
- **Profile**: avatar settings, target regions, experience limit, preferences (my profile filter lives here).

All tables get row level security like the existing ones.

## 4. The 3D scene

A cutaway glass building on three floors, seen with an orthographic isometric camera.

| Floor | Rooms |
|---|---|
| Ground | Reception (centre), Waiting Lounge, Communication Department |
| First | Research Department, Application Department, Interview Department |
| Top | Executive Floor, Learning and Development |

- Each department is its own component with a floor, furniture and a workstation for its character. Characters: Founder in Reception, Office Manager at the desk, Talent Scout (Research), HR Specialist (Application), Interview Coach, Messenger (Communication, walks between rooms), Learning Coach, Executive.
- Interaction: hover outlines a room, click glides the camera in and opens that department's panel. Clicking a character opens a short speech bubble with the most useful next action.
- Data on the walls and desks: Reception shows today's priorities on a screen, Research shows a stack of saved jobs, Application shows folders per stage, the Lounge shows a clock with the longest wait, and so on.
- Look: warm white, sage green, soft blue and small orange accents. Baked soft shadows (rendered once), an environment light, glass walls, plants. Performance target: smooth on a normal laptop and acceptable on a phone, with on demand rendering so it idles at near zero cost.

## 5. Milestones (each ends with something usable and a screenshot review)

- **M0 Visual proof.** Only Reception and the Office Manager, with real assets, lighting, camera and one animated character, on fake data. Done when you approve the look. This is the gate before anything else.
- **M1 Foundation.** Vite app, sign in, data layer, new tables, event bus, Reception connected to real roles and applications (priorities, statistics, notifications).
- **M2 Research Department.** Browse and save jobs from the collector, company notes, Talent Scout.
- **M3 Application Department.** Application pipeline, CV and cover letter versions, HR Specialist.
- **M4 Waiting Lounge and Communication.** Pending applications and response times, contacts, messages, follow up reminders, Messenger.
- **M5 Interview Department.** Calendar, preparation, question bank, case and numerical practice, feedback notes, Interview Coach.
- **M6 Executive Floor.** Offers, salary, benefits, negotiation, Executive.
- **M7 Learning and Development.** Skills, courses, progression, Learning Coach.
- **M8 Polish.** Founder avatar customisation, character reactions to every event, accessibility, mobile, performance, remove the old dashboard.

## 6. Risks and dependencies

- **Visual quality is the biggest risk.** Shapes built from basic boxes in code look cheap, which is the opposite of what you want. The premium look needs real modelled assets. I can pick and arrange free models and tune lighting, but I cannot hand sculpt custom art. M0 exists to prove the look early.
- **Assets.** Free sources I will check: Kenney and Quaternius (public domain, CC0), Sketchfab (per model licence) and Mixamo animations. A single pack with both an office and animated characters probably does not exist, so expect to combine sources and match their style. Rule: only CC0 or credit only licences, each listed in `LICENSES.md` with its source. Models are data files, and I scan them before use.
- **Characters** need rigged models and animations (idle, type, talk, walk, react). Matching eight into one consistent style is the hardest part.
- **File size and phones.** Budget about 15 MB of models, compressed. Test on a phone sized screen early.
- **Scope.** Eight departments with real features is large. Milestones keep a working app at every step. Each 3D room only ships with its real function behind it.
- **Dependencies:** three, @react-three/fiber, @react-three/drei, zustand, tailwindcss, react-router, zod, @supabase/supabase-js, vitest, playwright (for screenshot checks).

## Decisions needed from the owner

1. Approve the plan, or tell me what to change.
2. Replace the Next.js dashboard with Job HQ after M2, or keep both for a while?
3. Approve the asset rules (CC0 or credit only licences, listed, scanned).
4. Approve starting with M0 only.
