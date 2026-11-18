# Stage 1: Collector, Tracker and Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A daily collector that pulls public job postings from Greenhouse, Lever and Ashby for the owner's target companies, stores them, filters them with editable rules, emails the relevant new ones, and shows everything in a dashboard with a pipeline board and a sources health page.

**Architecture:** A Python package (`collector/`) reads `sources.yaml`, calls each public board API politely, normalises results into one `Role` shape, upserts them into Supabase Postgres, applies `rules.yaml`, and sends one digest email. A Next.js app (`web/`) reads and updates the same database for the owner only. GitHub Actions runs the collector once a day.

**Tech Stack:** Python 3.12, httpx, PyYAML, pytest, respx (HTTP mocking), supabase-py, Resend (email), Next.js (App Router, TypeScript), Supabase Auth and Postgres, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-11-17-job-tracker-design.md`

## Global Constraints

- Public sources only. Never read pages behind a login. Never use Runway's private endpoints.
- Polite requests: a descriptive User-Agent, at least 1 second between calls to the same host, one run per day.
- Secrets only in a local `.env` (already in `.gitignore`). Every new variable name goes into `.env.example` with an empty value. Production secrets live in GitHub Actions secrets and Vercel environment variables. No key in code, docs, logs, screenshots or commit messages.
- Single user. Supabase row level security on for every table. The public (anon) key must not be able to read data without the owner's login.
- English first. No local language search.
- Email send time: fixed morning, Europe/Madrid timezone. No email at all when nothing new matched.
- A broken source must never stop the other sources. The owner must be able to see which sources failed.
- Work on branch `claude/sharp-hamilton-mjermr`. Commit after each task. Push only when the owner asks.

## Review Focus

1. A company board does not exist (HTTP 404) or returns an empty list: the run continues, the source is marked failed or empty in health, and nothing crashes.
2. A source returns HTTP 429 or a timeout: retry once after a pause, then mark failed and move on.
3. A role vanishes from a board and later reappears: it is marked closed, then open again, keeping its original first seen date and the owner's stage and notes.
4. Missing or messy location ("Remote, Europe", empty string, "Zürich", "Köln or Basel"): never crashes, unparseable locations get no city, and rules decide explicitly whether an unknown location passes (it does not).
5. The same role posted on two sources, or an updated posting with the same id: one row per `(source, source_id)`, and the owner's stage and notes survive updates.

---

### Task 1: Project scaffold and the Role model

**Files:**
- Create: `collector/pyproject.toml`, `collector/src/jobtracker/__init__.py`, `collector/src/jobtracker/models.py`, `collector/tests/test_models.py`
- Modify: `.env.example`, `.gitignore` (add `.pytest_cache/`, `.next/`, `web/node_modules/` if missing)

**Interfaces:**
- Produces: `Role` dataclass in `jobtracker.models`:
  `Role(source: str, source_id: str, company: str, title: str, url: str, location_raw: str, city: str | None, country: str | None, remote: bool | None, description: str, posted_at: datetime | None)`
  and `Role.key -> tuple[str, str]` returning `(source, source_id)`.
- Produces `.env.example` variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `ALERT_EMAIL_TO`, `ALERT_EMAIL_FROM`, all with empty values.

- [ ] **Step 1: Write the failing test** in `test_models.py`: `test_role_key_is_source_and_source_id` builds a `Role` and asserts `role.key == ("greenhouse", "123")`; `test_role_is_immutable` asserts assigning to `role.title` raises `FrozenInstanceError`.
- [ ] **Step 2: Run** `cd collector && pytest tests/test_models.py -v`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the frozen dataclass, `pyproject.toml` with dependencies `httpx`, `pyyaml`, `supabase`, `resend` and dev dependencies `pytest`, `respx`, and add the `.env.example` variables.
- [ ] **Step 4: Run** the same command. Expected: 2 passed.
- [ ] **Step 5: Commit** `feat: scaffold collector and Role model`.

### Task 2: Source registry loader

**Files:**
- Create: `collector/src/jobtracker/registry.py`, `collector/tests/test_registry.py`, `sources.yaml` (three example entries for now; the real list is Task 12)

**Interfaces:**
- Consumes: nothing.
- Produces: `Source` frozen dataclass `Source(name: str, kind: str, board: str, city: str, field: str)` and `load_sources(path: Path) -> list[Source]`. `kind` is one of `greenhouse`, `lever`, `ashby`. `sources.yaml` is a list of mappings with those same keys.

- [ ] **Step 1: Write failing tests**: `test_load_sources_reads_entries` (two entries parsed with exact field values); `test_load_sources_rejects_unknown_kind` (kind `workday` raises `ValueError` naming the entry); `test_load_sources_rejects_duplicate_board` (same kind and board twice raises `ValueError`); `test_load_sources_empty_file_returns_empty_list`.
- [ ] **Step 2: Run** `pytest tests/test_registry.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `load_sources` with `yaml.safe_load` and explicit validation.
- [ ] **Step 4: Run** and expect 4 passed.
- [ ] **Step 5: Commit** `feat: add source registry loader`.

### Task 3: Greenhouse adapter

**Files:**
- Create: `collector/src/jobtracker/adapters/__init__.py`, `adapters/greenhouse.py`, `adapters/locations.py`, `collector/tests/fixtures/greenhouse.json`, `collector/tests/test_greenhouse.py`, `collector/tests/test_locations.py`

**Interfaces:**
- Consumes: `Source`, `Role`.
- Produces: `parse_location(raw: str) -> tuple[str | None, str | None, bool | None]` returning `(city, country, remote)` using a lookup for Barcelona, Basel, Zurich (also "Zürich"), Geneva, Brussels, Amsterdam, Copenhagen and their countries (Spain, Switzerland, Belgium, Netherlands, Denmark); unknown text returns `(None, None, remote_flag)`. Produces `fetch_greenhouse(client: httpx.Client, source: Source) -> list[Role]`.

- [ ] **Step 1: Verify the endpoint** against the official Greenhouse Job Board API documentation (`developers.greenhouse.io/job-board.html`), confirm `GET https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true`, and save one real sanitised response as `fixtures/greenhouse.json`. If the documented shape differs from this plan, follow the documentation and note the change in the commit message.
- [ ] **Step 2: Write failing tests**: `test_parse_location_zurich_with_umlaut` (`"Zürich, Switzerland"` gives `("Zurich", "Switzerland", False)`); `test_parse_location_remote_europe` (`"Remote, Europe"` gives `(None, None, True)`); `test_parse_location_empty_string` (gives `(None, None, None)`); `test_parse_location_two_cities` (`"Köln or Basel"` gives city `"Basel"`, country `"Switzerland"`); `test_fetch_greenhouse_maps_fields` using `respx` to serve the fixture and asserting source, company, title, url, city and that HTML in content is stripped to plain text; `test_fetch_greenhouse_404_returns_empty_and_raises_sourcemissing` asserting a `SourceNotFound` exception (defined in `adapters/__init__.py`).
- [ ] **Step 3: Run** `pytest tests/test_greenhouse.py tests/test_locations.py -v`. Expected: FAIL.
- [ ] **Step 4: Implement** both functions, plus `SourceNotFound(Exception)` and `SourceError(Exception)` in `adapters/__init__.py`. Strip HTML with the standard library `html.parser`.
- [ ] **Step 5: Run** and expect all passed.
- [ ] **Step 6: Commit** `feat: add Greenhouse adapter and location parsing`.

### Task 4: Lever adapter

**Files:**
- Create: `adapters/lever.py`, `tests/fixtures/lever.json`, `tests/test_lever.py`

**Interfaces:**
- Consumes: `Source`, `Role`, `parse_location`, `SourceNotFound`, `SourceError`.
- Produces: `fetch_lever(client: httpx.Client, source: Source) -> list[Role]`.

- [ ] **Step 1: Verify the endpoint** against the official `lever/postings-api` repository on GitHub (`GET https://api.lever.co/v0/postings/{board}?mode=json`, EU host `api.eu.lever.co`). Save a real sanitised fixture. Treat a `board` value starting with `eu:` in `sources.yaml` as the EU host and strip the prefix.
- [ ] **Step 2: Write failing tests**: `test_fetch_lever_maps_fields` (id, text as title, hostedUrl as url, `categories.location` as location, `createdAt` in milliseconds converted to a UTC datetime); `test_fetch_lever_eu_prefix_uses_eu_host`; `test_fetch_lever_404_raises_sourcenotfound`.
- [ ] **Step 3: Run** and expect FAIL.
- [ ] **Step 4: Implement** `fetch_lever`.
- [ ] **Step 5: Run** and expect passed.
- [ ] **Step 6: Commit** `feat: add Lever adapter`.

### Task 5: Ashby adapter

**Files:**
- Create: `adapters/ashby.py`, `tests/fixtures/ashby.json`, `tests/test_ashby.py`

**Interfaces:**
- Consumes: as Task 4.
- Produces: `fetch_ashby(client: httpx.Client, source: Source) -> list[Role]`.

- [ ] **Step 1: Verify the endpoint** against `developers.ashbyhq.com/docs/public-job-posting-api` (`GET https://api.ashbyhq.com/posting-api/job-board/{board}`). Save a sanitised fixture. The endpoint cannot filter, so filtering stays in rules.
- [ ] **Step 2: Write failing tests**: `test_fetch_ashby_maps_fields` (including `isRemote` to `remote` and `publishedAt` to a UTC datetime); `test_fetch_ashby_skips_unlisted_jobs` (entries flagged unlisted in the fixture are dropped); `test_fetch_ashby_404_raises_sourcenotfound`.
- [ ] **Step 3: Run** and expect FAIL.
- [ ] **Step 4: Implement** `fetch_ashby`.
- [ ] **Step 5: Run** and expect passed.
- [ ] **Step 6: Commit** `feat: add Ashby adapter`.

### Task 6: Matching rules

**Files:**
- Create: `collector/src/jobtracker/rules.py`, `rules.yaml`, `collector/tests/test_rules.py`

**Interfaces:**
- Consumes: `Role`.
- Produces: `Rules` dataclass with `countries: list[str]`, `include_keywords: list[str]`, `exclude_keywords: list[str]`, `field_keywords: dict[str, list[str]]`, `level_keywords: dict[str, list[str]]`; `load_rules(path: Path) -> Rules`; `matches(role: Role, rules: Rules) -> bool`; `tag_field(role: Role, rules: Rules) -> str | None`; `tag_level(role: Role, rules: Rules) -> str | None`.
- `rules.yaml` starts with countries Spain, Switzerland, Belgium, Netherlands, Denmark; include keywords analyst, consultant, consulting, associate, intern, internship, graduate, business development, strategy, investment, venture; exclude keywords senior, director, principal, vice president, head of; field keywords for consulting, finance, vc, business_analyst, business_development, health_science; level keywords for internship and entry_level.

- [ ] **Step 1: Write failing tests**: `test_matches_requires_country_in_list`; `test_matches_unknown_country_does_not_pass`; `test_matches_title_include_keyword_case_insensitive` (`"Business Analyst Intern"` passes); `test_matches_exclude_keyword_beats_include` (`"Senior Consultant"` fails); `test_matches_remote_europe_with_no_country_does_not_pass`; `test_tag_field_health_science_from_title_or_description`; `test_tag_level_internship`; `test_load_rules_missing_key_raises_valueerror`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** with word boundary matching so `"intern"` does not match `"internal"`; add `test_include_keyword_matches_whole_words_only` (`"Internal Auditor"` does not match `"intern"`).
- [ ] **Step 4: Run** and expect passed.
- [ ] **Step 5: Commit** `feat: add matching rules`.

### Task 7: Database schema and store

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `collector/src/jobtracker/store.py`, `collector/tests/test_store.py`

**Interfaces:**
- Consumes: `Role`, `Rules` tagging functions.
- Produces tables: `roles(id uuid pk, source text, source_id text, company text, title text, url text, location_raw text, city text, country text, remote boolean, description text, posted_at timestamptz, field_tag text, level_tag text, matched boolean, status text default 'open', first_seen timestamptz, last_seen timestamptz, unique(source, source_id))`; `applications(role_id uuid pk references roles, stage text default 'saved', notes text, assessment_type text, applied_at timestamptz, updated_at timestamptz)`; `source_runs(id uuid pk, source_name text, ran_at timestamptz, ok boolean, role_count int, error text)`. Row level security enabled on all three, with policies allowing only the authenticated owner. The collector uses the service role key, which bypasses these policies.
- Produces: `Store` class with `Store(client)` over a Supabase client protocol and methods `upsert_roles(roles: list[Role], matched: dict[tuple[str, str], bool], tags: dict[tuple[str, str], tuple[str | None, str | None]], now: datetime) -> list[Role]` (returns only roles never seen before), `close_missing(source: str, company: str, seen_ids: set[str], now: datetime) -> int`, `record_run(source_name: str, ok: bool, role_count: int, error: str | None, now: datetime) -> None`.

- [ ] **Step 1: Write failing tests** against an in-memory fake client defined in the test file: `test_upsert_returns_only_new_roles`; `test_upsert_keeps_first_seen_on_update`; `test_upsert_reopens_closed_role`; `test_close_missing_marks_absent_roles_closed_but_not_other_sources`; `test_upsert_never_touches_applications_table`; `test_record_run_stores_error_text`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Write** the migration, then implement `Store`.
- [ ] **Step 4: Apply the migration** to the owner's Supabase project using the Supabase connector (`apply_migration`), after the owner confirms which project to use. Run the security advisor (`get_advisors`) and confirm no table lacks row level security.
- [ ] **Step 5: Run** the tests and expect passed.
- [ ] **Step 6: Commit** `feat: add database schema and store`.

### Task 8: Collector run

**Files:**
- Create: `collector/src/jobtracker/run.py`, `collector/tests/test_run.py`

**Interfaces:**
- Consumes: `load_sources`, adapters, `load_rules`, `matches`, `Store`.
- Produces: `run_collection(sources: list[Source], rules: Rules, store: Store, client: httpx.Client, now: datetime, sleep: Callable[[float], None]) -> RunResult` where `RunResult(new_matched: list[Role], failures: list[tuple[str, str]], total_seen: int)`; and `main() -> int` reading env vars and returning exit code 0 unless every source failed.

- [ ] **Step 1: Write failing tests** with fake adapters passed in via a registry mapping: `test_one_failing_source_does_not_stop_others`; `test_not_found_board_recorded_as_failed_in_source_runs`; `test_429_is_retried_once_then_marked_failed`; `test_sleeps_between_calls_to_same_host` (assert the fake `sleep` was called with at least 1.0); `test_only_new_matched_roles_returned_for_email`; `test_empty_board_does_not_close_all_existing_roles_without_a_flag` (an empty list from a source that previously had roles marks the run as suspicious and does not close them).
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** `run_collection` and `main`. Send a descriptive User-Agent (`job-tracker personal tool`).
- [ ] **Step 4: Run** and expect passed.
- [ ] **Step 5: Commit** `feat: add collector run`.

### Task 9: Email digest

**Files:**
- Create: `collector/src/jobtracker/notify.py`, `collector/tests/test_notify.py`

**Interfaces:**
- Consumes: `Role`, `RunResult`.
- Produces: `build_digest(result: RunResult, dashboard_url: str) -> tuple[str, str] | None` returning `(subject, html_body)` or `None` when there are no new matched roles and no failures; `send_digest(subject: str, html_body: str, sender: Callable[[dict], object]) -> None` using Resend through an injected sender so tests need no network.

- [ ] **Step 1: Write failing tests**: `test_build_digest_none_when_nothing_new_and_no_failures`; `test_build_digest_lists_roles_grouped_by_city`; `test_build_digest_includes_failed_sources_section`; `test_build_digest_escapes_html_in_titles`; `test_send_digest_passes_from_and_to_from_env` (using `monkeypatch`).
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** both functions. Subject format: `"{n} new roles: {top city}"`.
- [ ] **Step 4: Run** and expect passed.
- [ ] **Step 5: Commit** `feat: add email digest`.

### Task 10: Daily scheduler

**Files:**
- Create: `.github/workflows/collect.yml`

**Interfaces:**
- Consumes: `python -m jobtracker.run` entry point from Task 8, wiring `build_digest` and `send_digest` at the end of `main`.

- [ ] **Step 1: Wire** `main` to call `build_digest` and `send_digest` after the run (add `test_main_sends_nothing_when_digest_is_none` to `test_run.py` first and watch it fail).
- [ ] **Step 2: Write the workflow**: cron once a day at 06:00 UTC (07:00 or 08:00 in Madrid depending on the season, a known and accepted shift), plus `workflow_dispatch` for manual runs. Secrets are read from GitHub Actions secrets named exactly as in `.env.example`. Run `pytest` before collecting, and fail the job if tests fail.
- [ ] **Step 3: Ask the owner** to add the secrets in the repository settings (the plan never handles key values). Then trigger one manual run and confirm in the Actions log that no secret value is printed.
- [ ] **Step 4: Commit** `feat: add daily collection workflow`.

### Task 11: Dashboard with login and the new roles list

**Files:**
- Create: `web/` Next.js project (App Router, TypeScript), `web/src/lib/supabase.ts`, `web/src/app/login/page.tsx`, `web/src/app/page.tsx`, `web/src/app/roles/RoleTable.tsx`, `web/src/lib/filters.ts`, `web/src/lib/filters.test.ts`, `web/src/middleware.ts`

**Interfaces:**
- Consumes: tables from Task 7 via the anon key and the owner's session.
- Produces: `applyFilters(roles: RoleRow[], f: {city?: string; field?: string; company?: string; level?: string; matchedOnly: boolean; search: string}) -> RoleRow[]`.

- [ ] **Step 1: Write failing tests** for `applyFilters` with Vitest: `filters by city`; `matchedOnly hides unmatched roles`; `search matches title and company case insensitively`; `empty filters return all roles unchanged and sorted newest first_seen first`.
- [ ] **Step 2: Run** `cd web && npx vitest run`. Expected: FAIL.
- [ ] **Step 3: Implement** `applyFilters`, then the login page (email magic link through Supabase Auth, sign ups disabled in the Supabase project so only the owner's email can log in), the middleware that redirects logged out visitors to `/login`, and the roles table with filter controls, a "Save" button that creates an `applications` row with stage `saved`, and a link to the original posting.
- [ ] **Step 4: Run** the tests, then start the dev server and confirm in a browser that a logged out visit redirects to login and that the table shows rows after the owner logs in. Confirm with the anon key and no session that a direct database read returns no rows.
- [ ] **Step 5: Commit** `feat: add dashboard login and roles list`.

### Task 12: Pipeline board

**Files:**
- Create: `web/src/app/pipeline/page.tsx`, `web/src/app/pipeline/Board.tsx`, `web/src/lib/stages.ts`, `web/src/lib/stages.test.ts`, `web/src/app/roles/[id]/page.tsx`

**Interfaces:**
- Produces: `STAGES = ["saved","applied","assessment","interview","offer","rejected"] as const`, `type Stage`, `groupByStage(apps: ApplicationRow[]) -> Record<Stage, ApplicationRow[]>`, `canMove(from: Stage, to: Stage) -> boolean` (any move allowed except to the same stage).

- [ ] **Step 1: Write failing tests**: `groupByStage returns every stage key even when empty`; `groupByStage puts unknown stages nowhere and does not throw`; `canMove rejects same stage`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the helpers, the board (one column per stage, move buttons that update `applications.stage` and `updated_at`), and the role detail page with notes, applied date, and an `assessment_type` text field.
- [ ] **Step 4: Run** the tests, then confirm in the browser that moving a card persists after a page reload.
- [ ] **Step 5: Commit** `feat: add pipeline board and role detail`.

### Task 13: Sources health page

**Files:**
- Create: `web/src/app/health/page.tsx`, `web/src/lib/health.ts`, `web/src/lib/health.test.ts`

**Interfaces:**
- Produces: `summariseHealth(runs: SourceRunRow[], now: Date) -> {name: string; lastOk: Date | null; lastError: string | null; status: "ok" | "failing" | "stale"}[]` where `stale` means no successful run in the last 3 days.

- [ ] **Step 1: Write failing tests**: `ok when the latest run succeeded`; `failing when the latest run failed, showing its error`; `stale when the last success is older than 3 days`; `source with no runs is stale with null dates`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** `summariseHealth` and the page (failing and stale sources first).
- [ ] **Step 4: Run** and expect passed, then check the page in the browser after the first real collector run.
- [ ] **Step 5: Commit** `feat: add sources health page`.

### Task 14: Starting source list and first real run

**Files:**
- Create: `collector/src/jobtracker/discover.py`, `collector/tests/test_discover.py`
- Modify: `sources.yaml`

**Interfaces:**
- Produces: `discover_board(client: httpx.Client, company_guess: str) -> Source | None`, which tries Greenhouse, Lever and Ashby with slug variants of the guess (lowercase, no spaces, hyphen and no hyphen) and returns the first that answers with HTTP 200 and at least one job, else `None`.

- [ ] **Step 1: Write failing tests** with `respx`: `finds a greenhouse board on the second slug variant`; `returns None when every board answers 404`; `does not call more than 9 URLs per company` (3 sources times 3 variants).
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** `discover_board`.
- [ ] **Step 4: Build the starting list**: propose about 40 companies across Barcelona, Basel and Zurich, Brussels, Amsterdam and Copenhagen, spread over consulting, finance, VC, biotech and pharma business roles. Run discovery for each, keep only those that resolve, and show the owner the resulting `sources.yaml` for review before committing. Companies that do not resolve go in a comment block at the bottom of the file as Stage 3 candidates.
- [ ] **Step 5: Run** the full test suite, then trigger the workflow manually once. Confirm in the dashboard that roles appear and that the health page lists every source.
- [ ] **Step 6: Commit** `feat: add starting sources and discovery helper`.

### Task 15: Stage 1 acceptance check

**Files:**
- Create: `docs/stage1-acceptance.md`

- [ ] **Step 1: Walk through** the spec's Stage 1 definition of done with the owner and record the result of each in `docs/stage1-acceptance.md`: a real daily run found real roles; one role was moved through the pipeline; an email arrived with only relevant roles; a deliberately broken source (a made up board name) showed as failing on the health page and in the email; nothing from `.env` appears in the git history (run a search of the history for the variable names with values, and run the GitHub secret scan tool).
- [ ] **Step 2: Fix** any failure before ticking it.
- [ ] **Step 3: Commit** `docs: record stage 1 acceptance`.

---

## Self review notes

- Spec coverage: collector (Tasks 3 to 5, 8), source list and discovery (2, 14), matching rules (6), database with row level security (7), dashboard parts (11 to 13), alert email with failure section (9), daily scheduler (10), secrets rule (Global Constraints, Tasks 1, 10, 15). Stage 2 and Stage 3 are out of scope for this plan and get their own plans.
- Names checked across tasks: `Role`, `Source`, `Rules`, `Store`, `RunResult`, `SourceNotFound`, `SourceError`, `parse_location`.
- Known risk carried from the spec: the three public endpoint shapes come from third party summaries, so Tasks 3 to 5 each start by verifying them against official documentation.
