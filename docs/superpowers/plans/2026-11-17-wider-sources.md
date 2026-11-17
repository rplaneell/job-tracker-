# Wider Sources and Compliance Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compliance gate and four new source readers (Personio, Teamtailor, SmartRecruiters, JSON-LD career pages), then grow the company list.

**Architecture:** A `PoliteClient` wraps `httpx.Client` and enforces robots.txt and a per host pause on every request, so every adapter is gated at one point. New adapters follow the existing `fetch_*(client, source) -> list[Role]` shape and register in `run.ADAPTERS`. `sources.yaml` gains `terms` and `basis` fields.

**Tech Stack:** Python 3.12, httpx, defusedxml (safe XML parsing), pytest, respx.

**Spec:** `docs/superpowers/specs/2026-11-17-job-tracker-design.md` (see the 2026-11-17 addendum)

## Global Constraints

- Every rule in the spec addendum's compliance gate applies to every task.
- User agent: `job-tracker personal tool (one check per day)`. One request per second per host at most.
- Untrusted XML and HTML are parsed with `defusedxml` or the standard `html.parser`, never `eval`, never executed.
- Secrets rule unchanged: nothing secret in code, docs or commits.
- Work on branch `claude/sharp-hamilton-mjermr`. Commit after each task. Push only when the owner asks.

## Review Focus

1. robots.txt unreachable, 5xx, or 403: that source is disallowed for the run and recorded as failed, never fetched anyway.
2. A page or feed with malformed or hostile XML (entity expansion) or invalid JSON-LD: the source fails cleanly, others continue.
3. Feeds with missing locations, missing dates, HTML in descriptions, or non English text: no crash, null fields.
4. A jsonld source without `terms: ok` in `sources.yaml`: refused at load with a clear message.
5. Duplicate postings inside one feed (same id twice): one row only.

---

### Task 1: Compliance gate (PoliteClient)

**Files:**
- Create: `collector/src/jobtracker/compliance.py`, `collector/tests/test_compliance.py`
- Modify: `collector/src/jobtracker/run.py` (wrap the http client in `main`)

**Interfaces:**
- Produces: `class PoliteClient(client: httpx.Client, user_agent: str, sleep: Callable[[float], None] = time.sleep, clock: Callable[[], float] = time.monotonic)` with `get(url: str, **kwargs) -> httpx.Response`; raises `adapters.SourceError("disallowed by robots.txt", None)` when disallowed. Pause between requests to the same host is `PAUSE_SECONDS = 1.0`.
- Robots rule: 200 parse and obey; 404 or 410 allow; 401, 403, other 4xx except 404/410/429, 5xx, 429 or network error disallow. The robots result is cached per host for the run.

- [ ] **Step 1: Write failing tests** with respx: `test_allows_when_robots_missing_404`; `test_blocks_path_disallowed_for_our_user_agent`; `test_allows_path_not_covered_by_disallow`; `test_blocks_everything_when_robots_returns_403`; `test_blocks_everything_when_robots_returns_500`; `test_blocks_when_robots_unreachable`; `test_robots_fetched_once_per_host` (route call count 1 across two gets); `test_sleeps_between_requests_to_same_host_only` (fake clock and sleep, second host no sleep, same host sleeps remaining time, never negative).
- [ ] **Step 2: Run** `cd collector && pytest tests/test_compliance.py -v`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** with `urllib.robotparser.RobotFileParser.parse(lines)`; the robots request itself carries the user agent and is also paced.
- [ ] **Step 4: Run** and expect all passed, then the full suite.
- [ ] **Step 5: Commit** `feat: add robots and pacing compliance gate`.

### Task 2: Source fields for terms review

**Files:**
- Modify: `collector/src/jobtracker/registry.py`, `collector/tests/test_registry.py`

**Interfaces:**
- Produces: `Source(name, kind, board, city, field, terms: str = "ok", basis: str = "")`; `KINDS` gains `personio`, `teamtailor`, `smartrecruiters`, `jsonld`; `load_sources` skips entries with `terms: no`, and raises `ValueError` naming the entry when kind is `jsonld` and `terms` is not `ok`, or when `terms` is not one of `ok`, `no`, `unreviewed`.

- [ ] **Step 1: Write failing tests**: `test_terms_no_entries_are_skipped`; `test_jsonld_requires_terms_ok` (missing and `unreviewed` both raise, message contains the entry name); `test_invalid_terms_value_raises`; `test_official_api_kinds_default_to_ok`; `test_new_kinds_are_accepted`.
- [ ] **Step 2: Run** and expect FAIL.
- [ ] **Step 3: Implement** the extra fields and checks.
- [ ] **Step 4: Run** and expect passed.
- [ ] **Step 5: Commit** `feat: add terms review fields to source list`.

### Task 3: Personio adapter

**Files:**
- Create: `adapters/personio.py`, `tests/fixtures/personio.xml`, `tests/test_personio.py`; Modify `pyproject.toml` (add `defusedxml`)

**Interfaces:**
- Produces: `fetch_personio(client, source) -> list[Role]` reading `https://{board}.jobs.personio.de/xml?language=en`; `source_id` is the position `id`; url is `https://{board}.jobs.personio.de/job/{id}`; location from `office`; description from the `jobDescriptions` values as plain text; `posted_at` from `createdAt` when present.

- [ ] **Step 1: Save a sanitised real sample** (one request to `personio.jobs.personio.de/xml?language=en`, trimmed to 2 positions) as the fixture.
- [ ] **Step 2: Write failing tests**: `test_fetch_personio_maps_fields`; `test_fetch_personio_missing_office_gives_empty_location`; `test_fetch_personio_duplicate_ids_returned_once`; `test_fetch_personio_rejects_entity_expansion` (a billion laughs payload raises `SourceError`); `test_fetch_personio_404_raises_sourcenotfound`.
- [ ] **Step 3: Run** and expect FAIL.
- [ ] **Step 4: Implement** with `defusedxml.ElementTree`.
- [ ] **Step 5: Run** and expect passed. **Step 6: Commit** `feat: add Personio adapter`.

### Task 4: Teamtailor adapter

**Files:**
- Create: `adapters/teamtailor.py`, `tests/fixtures/teamtailor.xml`, `tests/test_teamtailor.py`

**Interfaces:**
- Produces: `fetch_teamtailor(client, source) -> list[Role]` reading `https://{board}.teamtailor.com/jobs.rss`; `source_id` from `guid`; city and country from the `tt:locations` elements when present.

- [ ] **Step 1: Save a sanitised real sample** (`career.teamtailor.com/jobs.rss`, 2 items) as the fixture.
- [ ] **Step 2: Write failing tests**: `test_fetch_teamtailor_maps_fields`; `test_fetch_teamtailor_item_without_location`; `test_fetch_teamtailor_rejects_entity_expansion`; `test_fetch_teamtailor_404_raises_sourcenotfound`.
- [ ] **Step 3 to 5:** run red, implement, run green. **Step 6: Commit** `feat: add Teamtailor adapter`.

### Task 5: SmartRecruiters adapter

**Files:**
- Create: `adapters/smartrecruiters.py`, `tests/fixtures/smartrecruiters.json`, `tests/test_smartrecruiters.py`

**Interfaces:**
- Produces: `fetch_smartrecruiters(client, source) -> list[Role]` reading `https://api.smartrecruiters.com/v1/companies/{board}/postings?limit=100&offset={n}` and following `offset` until `totalFound`; public link `https://jobs.smartrecruiters.com/{board}/{id}`; country code mapped with the same table as Lever; description is the department and function text only (the list gives no full text, noted as a limit).

- [ ] **Step 1: Save a sanitised real sample** as the fixture. **Step 2: Write failing tests**: `test_fetch_smartrecruiters_maps_fields`; `test_fetch_smartrecruiters_follows_paging` (two pages via respx, 150 postings total gives 150 roles); `test_fetch_smartrecruiters_page_cap` (stops after 20 pages even if the server keeps claiming more); `test_fetch_smartrecruiters_404_raises_sourcenotfound`.
- [ ] **Step 3 to 5:** red, implement, green. **Step 6: Commit** `feat: add SmartRecruiters adapter`.

### Task 6: JSON-LD career page adapter

**Files:**
- Create: `adapters/jsonld.py`, `tests/fixtures/jsonld_page.html`, `tests/test_jsonld.py`

**Interfaces:**
- Produces: `fetch_jsonld(client, source) -> list[Role]` where `source.board` is the full career page URL; reads every `<script type="application/ld+json">` block with `html.parser`, finds `JobPosting` objects (top level, inside `@graph`, or inside an `ItemList`), maps `title`, `url`, `datePosted`, `jobLocation.address.addressLocality` and `addressCountry`, `jobLocationType` of `TELECOMMUTE` to remote, `description` as plain text, `identifier.value` or the url as `source_id`.

- [ ] **Step 1: Write failing tests**: `test_jsonld_single_jobposting`; `test_jsonld_graph_and_itemlist`; `test_jsonld_invalid_json_block_is_skipped_not_fatal`; `test_jsonld_page_without_jobs_returns_empty`; `test_jsonld_location_as_list_and_string_country`; `test_jsonld_missing_date_is_none`.
- [ ] **Step 2 to 4:** run red, implement, run green. **Step 5: Commit** `feat: add JSON-LD career page adapter`.

### Task 7: Wire in, discovery and a bigger list

**Files:**
- Modify: `run.py` (register adapters, wrap client with `PoliteClient`), `discover.py` (probes for Personio, Teamtailor, SmartRecruiters), `tests/test_run.py`, `tests/test_discover.py`, `sources.yaml`

- [ ] **Step 1: Write failing tests**: `test_run_uses_adapter_for_each_new_kind`; `test_discover_finds_personio_board`; `test_discover_finds_teamtailor_board`; `test_discover_stays_within_request_budget` (at most 14 URLs per company).
- [ ] **Step 2 to 4:** run red, implement, run green.
- [ ] **Step 5: Research and propose** a company list of at least 150 small and specialised firms (boutique and healthcare consultancies, life science strategy firms, small and health focused VCs, biotech and medtech companies, fintech) across Barcelona, Switzerland, Belgium, the Netherlands and Denmark; run discovery for each; record `terms` and `basis`; show the owner `sources.yaml` for review before committing.
- [ ] **Step 6: Live dry run** against all found sources with the fake database, report totals, failures, and how many roles pass the rules.
- [ ] **Step 7: Commit** `feat: wire new sources and extend source list`.
