# Job HQ amendment: an agentic AI office (for approval, nothing built yet)

Date: 2026-11-18. Status: waiting for the owner's approval. This amends `2026-11-18-job-hq-proposal.md`.

## What changes

Each office character is a real AI agent, not an animation. The 3D office is a live view of what the agents are actually doing. Three rules shape everything below:

1. **Real or labelled.** An agent either runs real model calls through real tools, or it is shown as "Simulated" everywhere. Nothing pretends.
2. **Approval is enforced by the system, not requested from the model.** An agent cannot send an email, submit an application or contact a recruiter. It can only create an approval request. A separate executor performs the action after you approve, and checks that what was approved is exactly what gets sent.
3. **The scene reflects state, never invents it.** Every glow, handoff and notification in 3D comes from a database row.

## 1. Where the agents run

Agents run on a server, never in the browser, because model keys must stay secret and work must continue when the page is closed.

- **Recommended: Supabase Edge Functions plus a Postgres task queue**, in your existing Supabase project. This keeps everything in the accounts you already use. Each agent step is one short function call: read the task, call the model, run tools, save the result, queue the next step. State lives in the database, so any step can resume after a failure. Edge Functions have run time limits, which is why work is split into steps. I will verify the current limits before building.
- Alternative: a small separate Node service. More freedom, but another thing to host and pay for. Not recommended for a single user.
- Model keys are stored as Supabase secrets that you enter in the Supabase dashboard yourself. They never appear in the browser, the repository, chat or logs.

## 2. The eight separations

| # | Concern | Design |
|---|---|---|
| 1 | Agent definitions and instructions | A versioned record per agent: role, responsibilities, system instructions, objectives, allowed tools, model choice, budget. Edits create a new version, so any past run can be replayed against the exact instructions it used. |
| 2 | Execution and orchestration | A runner executes one step at a time (plan, call model, run tools, record). The Office Manager is the orchestrator: it breaks a goal into tasks and assigns them. Runner code knows nothing about specific agents. |
| 3 | Tool integrations | A tool registry. Each tool has a name, description, input schema, and a risk class. Agents only see tools they are granted. Adding a tool or agent means adding a file and a grant, not rewriting the app. |
| 4 | Shared application data | The same Supabase tables the app uses (jobs, applications, companies, contacts). Agents read and write them only through tools, never directly. |
| 5 | Agent to agent communication | A messages table with typed messages (request, result, question, handoff). Delegation is a tool: the Office Manager creates a child task assigned to a specialist, with a written brief. |
| 6 | Task queues and workflows | A tasks table with parent and child tasks, status, priority, owner agent and step history. Workflows are tasks that spawn tasks. |
| 7 | Approval and permissions | An approvals table and a policy engine (details below). |
| 8 | Activity logs and audit | An append only audit log of every model call, tool call, message, approval and decision. No update or delete is allowed, even for the service role. |

## 3. Provider layer

One interface, many adapters. The app and runner talk to `LLMProvider`, never to a vendor library:

```
generate(messages, tools, options) -> { text, toolCalls, usage }
```

- Messages and tool definitions use one neutral format (JSON Schema for tools). Each adapter translates to and from its vendor.
- Adapters planned: Anthropic, OpenAI, Google, and any OpenAI compatible endpoint (which covers local models). Only the first one is built first; the interface is what makes the rest cheap.
- Each agent names a provider and model in its definition. A `provider_configs` table holds the choice and settings, never the key.
- A fake provider returns scripted responses for tests, so the whole runner is tested without spending money or needing a key.

## 4. Approval and permissions (mandatory, enforced in the database)

| Action class | Examples | Rule |
|---|---|---|
| Read | search jobs, read applications, fetch a public page | Automatic, logged |
| Internal write | save a job, create a task, write a draft, set a reminder | Automatic, logged |
| External or consequential | send an email, submit an application, contact a recruiter, send a calendar invite to others, message anyone | **Approval required, always** |
| Destructive | delete records | Approval required |

How it is enforced, not just requested:

- External tools do not run for an agent. When an agent calls one, the system stores an approval request containing the exact content (the full email, the exact application package) and a hash of it.
- You see exactly that content, approve or reject, and can edit it. An edit creates a new hash.
- The executor sends only when the approval is "approved" and the hash matches what is about to be sent. A database trigger refuses to set a request to approved unless it is you, signed in, so neither an agent nor the service key can approve its own request.
- Approval requests expire. There is also a pause all agents switch and per agent permission and budget limits.

## 5. Agent status and the 3D office

Status comes from the database and is pushed to the browser live with Supabase Realtime.

| Status | Source | What you see |
|---|---|---|
| Idle | no active task | Character at desk, screen dim |
| Working | a step is running | Screen lit, typing animation |
| Researching | a read tool such as search or fetch is running | Screen shows search results, papers on desk |
| Collaborating | a message or handoff between two agents | A document visibly moves between the two desks, a link line is shown, both face each other |
| Waiting for approval | a pending approval | A pulsing card above the character and an item in your approval inbox |
| Completed | task finished | Brief confirmation, then back to idle |
| Failed or blocked | error or budget stop | Warning mark and a clear reason |

The scene receives plain status values and never calls agents itself. Every visual has a matching row you can open in the Activity panel, so what you see can always be checked.

## 6. The first version: architecture and a clearly labelled simulation

- Build everything above except real model calls: definitions, registry, queue, approvals, audit, provider interface, fake provider, and status driven visuals.
- A **simulation runtime** plays scripted scenarios so you can see and test the interface. Every simulated agent shows a "Simulated" badge, the office shows a "Simulation mode" banner, and simulated runs never touch real data or send anything.
- An agent is switched to "Live" only when a real provider is configured, its real tools are connected, and its tests pass. Until then the interface says "Not connected".

## 7. Revised milestones

- **M0 Visual proof.** Done in code, waiting for you to approve the look.
- **M1 Foundation.** App skeleton, sign in, core data tables, Reception on real jobs and applications.
- **M2 Agent core, no real AI.** Agent definitions, tool registry, task queue, messages, approvals with enforcement, audit log, provider interface with a fake provider, simulation runtime, and live status in the 3D office. All tested without any AI.
- **M3 First live agents.** Office Manager and Talent Scout on one real provider, with read tools and internal writes only (search the jobs database, summarise, save, create tasks). Real tests and budget limits. Nothing external.
- **M4 and later: one department at a time.** Each adds its agent, its tools and its 3D behaviour together: HR Specialist (applications and document versions), Interview Coach (question bank, case and numerical practice, feedback), Messenger (reminders and drafted messages, all sending behind approval), Learning Coach, Executive (offers and negotiation notes).

## 8. Honest limits and risks

- **Models cost money and are not predictable.** Hard per task and monthly caps, step limits and the pause switch are part of the design from the start.
- **Prompt injection.** Job posts and web pages are untrusted text and can try to steer an agent. Fetched content is passed as data, tools have narrow inputs, and external actions need your approval, which is the last line of defence.
- **Submitting applications automatically is not realistic.** Most hiring forms need accounts, block bots and often forbid automation. The Application agent will prepare the materials and open the posting for you. Where an application is by email, it can draft and send that email after your approval.
- **LinkedIn and similar sites forbid automated messaging.** Recruiter outreach there is drafted for you to send yourself.
- **Edge Function limits** (run time and memory) shape the step design. I will confirm current limits before M2.
- **Several agents talking to each other can loop or waste money.** Depth and step limits apply to delegation.

## Decisions needed from the owner

1. Run the agents on Supabase Edge Functions with a Postgres queue (recommended), or elsewhere?
2. Which provider should the first adapter use? The layer supports all; pick the one you already have an account and key for.
3. Are the approval rules above right? Anything that should need approval and does not, or the reverse?
4. A monthly spending cap for model calls, for example 10 euros, as a hard stop.
5. Do you approve the M0 look, so I can finish its last checks and move to M1?
