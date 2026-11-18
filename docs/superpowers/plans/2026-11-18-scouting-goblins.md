# Scouting Goblins in the Glass Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Scouting agent appears in the 3D office as a small crew of goblins working in the glass office, and their behaviour shows the agent's real status.

**Architecture:** One free low poly goblin model is loaded once and cloned for each crew member. A pure function turns the real Scouting status into a pose for each goblin, so the scene holds no job search logic and nothing is invented. Clicking a goblin opens the existing Scouting panel.

**Tech Stack:** React Three Fiber, drei (`useGLTF`, `useAnimations`, `SkeletonUtils.clone`), glTF-transform (meshopt, webp), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-job-hq-agents-proposal.md` (section 5, status and the 3D office) and `docs/superpowers/plans/2026-11-18-scouting-agent.md`.

## Global Constraints

- Free models only, with a licence that allows use. The artist is credited in `hq/src/ui/Credits.tsx` and `hq/public/models/LICENSES.md`, naming the licence and any changes.
- The scene never invents activity: every pose comes from the status of the newest Scouting task. Crew size is decoration and is said to be decoration on the panel.
- Downloaded files are untrusted: each in its own new folder, nothing run from inside it.
- The look must fit the existing office: same palette treatment as the Manager.
- Low power mode must still work: fewer shadows and no extra animation.
- Commit subjects 72 characters or fewer, no hyphens or dashes in prose. Each check needs a failing run first. Existing tests and coverage floors stay green.

## Review Focus

- A goblin standing inside a wall or desk: positions are checked against the room box in tests and in a screenshot.
- Status changes while the page is open: poses change without a reload and without a pose from a stale status.
- A model that fails to load: the office still renders and shows no half built goblins.
- Weak laptops and phones: the crew stays light (small file, one shared model, no extra lights).
- Clicking the glass or a goblin: opens Scouting once and never opens Reception by mistake.

---

### Task 7a: Choose and prepare the goblin model

**Files:**
- Create: `hq/public/models/goblin.glb`
- Modify: `hq/public/models/LICENSES.md`, `hq/src/ui/Credits.tsx`

- [ ] **Step 1:** Compare the two candidates in the scene against the Manager's size and style: "Low Poly Goblin (Rigged)" by Yanez Designs (1,146 faces, one animation) and "Low poly Goblin" by SkyFightUltra (2,698 faces). Pick the one that looks best next to the Manager. Both are CC Attribution.
- [ ] **Step 2:** Run the existing glTF pipeline (meshopt, webp, palette recolour) and keep the file under 300 KB.
- [ ] **Step 3:** Add the credit with title, artist, link, licence and the changes made (recoloured, compressed). Add a test in `Credits` data that every model file in `public/models` has a credit entry.
- [ ] **Step 4:** Commit `feat: add the goblin model with its credit`.

### Task 7b: Goblin poses from the real status (pure rules)

**Files:**
- Create: `hq/src/domain/goblins.ts`, `hq/src/domain/goblins.test.ts`

**Interfaces:**
- Consumes: `ScoutStatus` from `hq/src/domain/scouting.ts`.
- Produces: `type Pose = 'sleeping' | 'waiting' | 'working' | 'cheering' | 'slumped'`, `crewPoses(status: ScoutStatus, crewSize: number): Pose[]`, `CREW_SIZE = 4`.

- [ ] **Step 1: Failing tests:** `idle` gives all `sleeping`; `waiting` gives all `waiting`; `working` gives all `working`; `completed` gives all `cheering`; `failed` gives all `slumped`; the result length always equals `crewSize`; a `crewSize` of 0 or less gives `[]`.
- [ ] **Step 2: Run, expect FAIL. Step 3: Implement. Step 4: Run, expect PASS with coverage at the floors.**
- [ ] **Step 5: Commit** `feat: add goblin pose rules driven by Scouting status`.

### Task 7c: The goblins in the glass office

**Files:**
- Create: `hq/src/scene/GoblinCrew.tsx`
- Modify: `hq/src/scene/layout.ts` (room box and desk spots), `hq/src/scene/Scene.tsx`, `hq/src/app/App.tsx`

**Interfaces:**
- Consumes: `crewPoses`, `Pose`, the model from 7a.
- Produces: `<GoblinCrew status={ScoutStatus} shadows={boolean} />`; layout constant `GLASS_OFFICE = { box: {min, max}, spots: [x, y, z, rotationY][] }` with 4 spots.

- [ ] **Step 1: Failing test** in `layout.test.ts`: every spot lies inside `GLASS_OFFICE.box` and no two spots are closer than 0.5 m.
- [ ] **Step 2:** Measure the glass office box and desk positions from the office model file, as was done for the reception desk, and write them into `layout.ts`. Run the test, expect PASS.
- [ ] **Step 3:** Build `GoblinCrew`: clone the model per goblin with `SkeletonUtils.clone`, give each a small pose animation (sleeping: slow breathing and a "z" sprite; waiting: looking toward the door; working: leaning to the desk with the screen glowing; cheering: a short hop; slumped: head down with a warning mark). Poses beyond the single model animation are simple procedural motion, and a failed model load renders nothing.
- [ ] **Step 4:** Click or hover on any goblin opens Scouting and sets the pointer cursor, with `stopPropagation` so Reception never opens.
- [ ] **Step 5:** Focus the camera on the glass office when Scouting is open (reuse `CameraRig`, add a second focus target).
- [ ] **Step 6:** Screenshot all five statuses and the click target, check that no goblin touches a wall or desk, and send them for approval.
- [ ] **Step 7: Commit** `feat: show the scouting goblins in the glass office`.

### Task 7d: Proof

- [ ] **Step 1:** Ledger entries for the pose rules (failing test first, deliberate break caught) and for the model credit check.
- [ ] **Step 2:** Run the repo rules check, push, read CI on GitHub.

## Not in this plan

Other departments and characters, goblin names or dialogue, and a goblin per task. Crew size is fixed at 4 and is decoration. Only the poses are real, because they come from the task status.
