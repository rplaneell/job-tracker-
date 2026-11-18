# Job tracker: design

Date: 2026-11-17
Status: draft, waiting for the owner's approval

## Intent and the why

The owner is in the second year of a dual master's (bioengineering and industrial business management), graduating in June 2027, with two final theses (TFMs, trabajo fin de master) to write at the same time. They want a personal tool that finds new openings for them automatically, tracks every application, and helps them prepare for the assessments those jobs use.

The idea comes from Runway (app.joinrunway.io), a job board with filters, a "newest first" list, alerts and a match score. This tool is not a copy of Runway. It is tuned to one person: their roles, their cities and their timeline. A broad board cannot do that.

Recruiting for graduate programmes in these fields often opens months before the start date, so the owner needs useful alerts in the next few weeks, not at the end of a long build.

## Who it is for

One user: the owner. No sign up, no multi user features, no public launch.

## Target roles and places

- Fields: consulting, finance, VC (venture capital), business analyst, business development. Some roles specialised in health science (healthcare consulting, biotech strategy, life science investing, pharma business roles).
- Levels: internships and entry level or graduate programme roles, starting around mid 2027.
- Places: Barcelona, Switzerland (Basel and Zurich first), Belgium (Brussels), the Netherlands (Amsterdam), Denmark (Copenhagen).
- Language: English first. Local languages are a later option and not part of this design.

## Goals

1. Find new roles in the target fields and places every day without the owner searching by hand.
2. Send a short email when good new roles appear.
3. Track every role through stages: Saved, Applied, Assessment, Interview, Offer, Rejected.
4. Help the owner practise case interviews and numerical tests.
5. Add harder sources over time, one at a time.

## Non goals

- Not a public product, no other users.
- No automatic applying and no auto filled forms.
- No copying of Runway's data and no use of its private endpoints.
- No scraping of pages that sit behind a login.
- No resume parsing or match score in the first release (see "Left to the builder").

## Anti goals (a failure even if it technically works)

- It eats the owner's thesis time because it needs constant fixing. Sources must fail quietly and the owner must be told clearly when one breaks.
- A flood of irrelevant roles. A noisy daily email will get ignored.
- A key or password reaching GitHub, even briefly.
- Breaking a website's terms of use or being impolite to its servers.

## Constraints

- Free or near free to run. Use free tiers.
- Secrets rule: API keys, tokens and passwords live only in a local `.env` file. `.env` is already in `.gitignore` and `.env.example` already exists in the repo (checked). Keep adding variable names to `.env.example` with empty values. Production secrets live in the hosting provider's secret settings (GitHub Actions secrets, Vercel environment variables), never in code, docs, chat or commits. If any key ever reaches GitHub, revoke it and make a new one.
- Public sources only, with a polite request rate (a pause between calls, a clear user agent, one check per day per source).
- Time boxed: Stage 1 should be usable within a few weeks.

## Approaches considered

A. Small web app with a scheduled collector and database. Chosen.
B. Spreadsheet plus email digest. Fastest, but practice tools do not fit and it becomes clumsy at hundreds of roles.
C. No code automation tool (n8n or Make with Airtable). Quick to start, but monthly cost, limits, and it fights custom practice features.

The owner picked A on 2026-11-17 and asked for all three stages.

## Design

### Parts

1. **Collector.** A script that runs once a day on GitHub Actions (free scheduler). It reads a source list, calls each source, normalises the results into one shape, and saves new or changed roles in the database.
2. **Database.** Supabase (Postgres, free tier). Single user. Row level security on, so the public key cannot read data.
3. **Dashboard.** A simple web app with: a "New roles" list (newest first, filters by city, field, company, level), a pipeline board for the stages, a role detail page with notes and dates, and a "Sources health" page.
4. **Alerts.** One daily email (or none if nothing new matched) listing new roles that pass the owner's rules, sent through an email service with a free tier.
5. **Practice module (Stage 2).** Case interview practice and numerical test practice, inside the same app.

### Source list

A file in the repo (`sources.yaml`) with one entry per company or board: name, city, field, source type, and the identifier that source needs (for Greenhouse, Lever and Ashby, the company board name). The owner can edit this file to add companies. A helper script suggests candidates for a company name by trying the known public board addresses.

Public endpoints for Stage 1 (taken from third party summaries, so verify each against the vendor's official documentation before building):
- Greenhouse: `boards-api.greenhouse.io/v1/boards/{company}/jobs`
- Lever: `api.lever.co/v0/postings/{company}?mode=json` (EU host `api.eu.lever.co`)
- Ashby: `api.ashbyhq.com/posting-api/job-board/{company}`

### What is in a role record

Source, company, title, city and country, remote or on site if given, posted date if given, link to the original posting, short description text, first seen date, last seen date, status (open or closed), field tag, level tag, and the owner's own stage and notes.

### Matching rules

Plain, editable rules in a config file: allowed countries and cities, title keywords to include (analyst, consultant, associate, intern, business development, and so on), title keywords to exclude (senior, director, and so on), and field tags by keyword. Roles that pass appear in the email. All roles stay visible in the dashboard behind a filter, so nothing is hidden for good. A learned match score is out of scope for now.

### Staged delivery

**Stage 1: collector, tracker and alerts.**
- Source list with an initial set of companies across the five places and the target fields.
- Daily collector with the three public sources.
- Database, dashboard (new roles, pipeline board, sources health).
- Daily email.
- Done when: a real daily run finds real roles, the owner can move one through the pipeline, and an email arrives with only relevant roles.

**Stage 2: practice.**
- Case interviews: a bank of cases by type (market entry, profitability, market sizing, pricing, health sector cases), a timer, a notes area, and written feedback on the owner's answer from Claude through the Claude API (the key lives in `.env`). The owner reviews and rates each session, and history is saved.
- Numerical tests: timed sets in the style of common graduate assessments (tables, charts, percentages, ratios), generated and checked by code so the answers are exact, with scores and weak area tracking.
- Behavioural questions: a simple list of prompts with a place to write and refine stories.
- Link each role to the assessment type its company is known to use, entered by the owner.
- Done when: the owner can run a timed numerical set and a case session end to end and see their history.

**Stage 3: harder sources.**
- Big firm career sites (many run on heavier systems such as Workday), and shared VC portfolio job boards, added one adapter at a time. Each adapter is added only after checking that the page is public and its terms allow automated reading.
- Done when: the agreed priority list of firms is covered, or each one is marked as not possible with the reason.

## My calls (the owner did not decide these, please correct any you dislike)

- Collector language: Python.
- Dashboard: a React based web app (Next.js), hosted on Vercel's free tier.
- Database: Supabase, because the owner already has the connector available.
- Scheduler: GitHub Actions on a daily cron.
- Email: a service with a free tier (Resend as the first choice).
- Case feedback: Claude through the Claude API.
- English first, no local language search in the first release.
- The first email is sent at a fixed morning time in the owner's timezone (Europe/Madrid).

## Left to the builder

- Exact list of starting companies per city and field (the owner can review it).
- Exact database tables and screen layouts.
- Whether to add a resume based match score later (needs the owner's resume and is a new request).
- How to word and tune the matching rules.

## Risks

- Large firms may not offer public data, so Stage 3 may only cover part of them.
- Public endpoints can change without notice. The Sources health page and a failure email cover this.
- Terms of use differ per site. Check each one before adding it.

## Addendum, 2026-11-17: wider sources and the compliance gate

The owner asked to cover the vast majority of sources that can legally be read, including small and specialised firms. LinkedIn, Indeed and Glassdoor are out because their terms forbid automated collection (the owner's LinkedIn route is email alerts, a later step). This addendum is not legal advice. The rules below are deliberately cautious and the owner confirmed all of them.

### Compliance gate (applies to every source)

1. Official public feed or API first. Scrape pages only when none exists.
2. Public pages only. No login, no fake accounts, nothing that gets around blocking. If a site blocks the tool, drop that source.
3. robots.txt is read automatically and respected, per request. A missing robots file (404) allows. Access denied (401 or 403), a server error or no answer disallows for that run.
4. Terms of use are read once per site by a person or by Claude, and the result is saved in `sources.yaml` (`terms: ok | no`, `basis`, `reviewed_on`). Reading HTML pages without `terms: ok` is refused. Entries marked `no` are skipped.
5. One request per second per host at most, once a day, with the user agent `job-tracker personal tool (one check per day)`.
6. Keep only job data: title, location, link, short description, posting date. No recruiter or candidate personal data. Every role links back to its original posting.

### New sources, in order

Verified with one light request each on 2026-11-17: Personio XML feed (robots allows all), Teamtailor RSS feed (job pages allowed), SmartRecruiters public postings API (answered without a login). Not verified, so not included: Recruitee (guessed address failed; needs a real company to test). Dropped: Workable (official API needs a token, public address blocked the first request).

Then a generic reader for schema.org JobPosting markup (JSON-LD) on company career pages that pass the gate. Large firms on undocumented systems (for example Workday) are reviewed one by one and may be marked `no`.

### Out of scope here

LinkedIn email alert reading, Adzuna and Jooble (need keys from the owner), Getro boards (unverified).

## Addendum, 2026-11-18: owner profile filter

The owner has R&D biotech and lab experience and no management experience. Roles that do not fit that profile are filtered out, using two editable rules in `rules.yaml`:

- Management and senior titles are excluded (manager, lead, head, director, vp, vice president, chief, partner, principal, staff, senior).
- `max_years_experience: 2`. A role whose description asks for more years of experience than that is excluded. For a range such as 3 to 5 years the lower number counts. Years only count when the word experience appears nearby, so "founded 10 years ago" is ignored. A role that states no requirement passes.

Open items for the builder: a positive signal for roles that use a biotech or lab background (for example a tag), and a way to show why a role was filtered out so the owner can correct a wrong exclusion.
