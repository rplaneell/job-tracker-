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

## 3b. Free by design (owner requirement, 2026-11-18)

The whole system must cost nothing to run: no card, no paid plan, no spending cap to raise. The spending limit is therefore zero, and the design enforces it.

**What is free today** (figures come from third party summaries and change often, so each one is verified in the provider's own console before we rely on it):

| Part | Free option | What to know |
|---|---|---|
| Server, queue, database | Supabase free plan | About 500,000 Edge Function calls a month, 256 MB memory, 200 live connections. A free project pauses after 7 days with no activity. The daily job collection already touches the database every day, which keeps it awake. |
| Models | Groq free tier (no card) | Roughly 30 requests a minute and 1,000 or more a day, per account. Reports of the exact numbers conflict. Open models such as Llama. Supports tool calling. |
| Models | Google Gemini free tier | Generous, but Google's terms say free tier prompts may be used to improve its products and may be read by humans. Do not send CV or contact details through it. |
| Models | OpenRouter free models | About 20 requests a minute and only 50 a day without buying credits, and tool calling on free models is reported unreliable. Not suitable as the main provider. |
| Models | Local models (Ollama) on your own computer | Free and fully private. Needs a computer that stays on while agents work, and weaker models. |
| Email | Resend free plan | About 100 emails a day. Already used by the collector. |
| Web hosting | A free static host such as Cloudflare Pages or Vercel Hobby | To be confirmed when we deploy. |

**How the design enforces free:**

1. **Free only providers.** Each provider config has a `cost: free` flag. The system refuses to call a provider that is not marked free. Keys come only from accounts with no billing attached, so an overrun cannot charge you.
2. **A quota guard.** The runner counts requests and tokens per provider against its free limits and stops before the limit. An agent that hits the limit shows a new status, "Waiting for quota", and its task resumes automatically when the limit resets. Agents work in the background, so waiting is acceptable.
3. **A provider fallback chain.** If one free provider is exhausted, the task moves to the next allowed one.
4. **Few model calls per task.** One call to plan, one to three per specialist, short chains, and delegation depth limits. Rate limits make long conversations between agents impractical on free tiers, so agents hand over structured briefs, not chat.
5. **A data protection tag on every provider** (`trains_on_data: yes, no or unknown`) and on every kind of data. CV text, contact details and notes are private data. Private data only goes to providers marked `no`, or to a local model. Agents are given only the fields a task needs.

**Honest consequences of free:**

- Free open models are weaker and less reliable at tool calling than paid ones. An agent only goes Live after it passes its tests with the model it will actually use. If a free model cannot do a job reliably, that agent stays Simulated or becomes a drafting helper that always asks for review.
- Free limits can shrink or change without notice. The provider layer exists so a change costs one adapter, not a rewrite.
- Busy days will show agents waiting. That is the real state and the office will show it.

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
| Waiting for quota | a free provider limit was reached | Screen dim with a small clock, task resumes by itself |
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
- **M3 First live agents.** Office Manager and Talent Scout on one free provider (with a local model as the private option), with read tools and internal writes only (search the jobs database, summarise, save, create tasks). Real tests and budget limits. Nothing external.
- **M4 and later: one department at a time.** Each adds its agent, its tools and its 3D behaviour together: HR Specialist (applications and document versions), Interview Coach (question bank, case and numerical practice, feedback), Messenger (reminders and drafted messages, all sending behind approval), Learning Coach, Executive (offers and negotiation notes).

## 8. Honest limits and risks

- **Free models are less predictable and rate limited.** Quota guard, step limits, tests before going Live and the pause switch are part of the design from the start. Nothing is allowed to spend money.
- **Prompt injection.** Job posts and web pages are untrusted text and can try to steer an agent. Fetched content is passed as data, tools have narrow inputs, and external actions need your approval, which is the last line of defence.
- **Submitting applications automatically is not realistic.** Most hiring forms need accounts, block bots and often forbid automation. The Application agent will prepare the materials and open the posting for you. Where an application is by email, it can draft and send that email after your approval.
- **LinkedIn and similar sites forbid automated messaging.** Recruiter outreach there is drafted for you to send yourself.
- **Edge Function limits** (run time and memory) shape the step design. I will confirm current limits before M2.
- **Several agents talking to each other can loop or waste money.** Depth and step limits apply to delegation.

## Decisions needed from the owner

1. Run the agents on Supabase Edge Functions with a Postgres queue (recommended), or elsewhere?
2. Which free provider should the first adapter use? My recommendation is Groq for ordinary tasks, plus a local model for anything involving your CV or contacts. Avoid the Gemini free tier for private data.
3. Are the approval rules above right? Anything that should need approval and does not, or the reverse?
4. Answered: it must be free. The spending cap is zero and section 3b describes how it is enforced.
5. Do you approve the M0 look, so I can finish its last checks and move to M1?
