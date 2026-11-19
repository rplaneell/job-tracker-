from __future__ import annotations

import os
import re
import sys
import time
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import httpx

from jobtracker.adapters import SourceError, safe_url
from jobtracker.adapters.ashby import fetch_ashby
from jobtracker.adapters.greenhouse import fetch_greenhouse
from jobtracker.adapters.jsonld import fetch_jsonld
from jobtracker.adapters.lever import fetch_lever
from jobtracker.adapters.personio import fetch_personio
from jobtracker.adapters.smartrecruiters import fetch_smartrecruiters
from jobtracker.adapters.teamtailor import fetch_teamtailor
from jobtracker.compliance import PoliteClient
from jobtracker.models import Role
from jobtracker.registry import Source, load_sources
from jobtracker.rules import Rules, in_region, load_rules, matches, tag_field, tag_level
from jobtracker.store import Store

ADAPTERS: dict[str, Callable[[httpx.Client, Source], list[Role]]] = {
    "greenhouse": fetch_greenhouse,
    "lever": fetch_lever,
    "ashby": fetch_ashby,
    "personio": fetch_personio,
    "teamtailor": fetch_teamtailor,
    "smartrecruiters": fetch_smartrecruiters,
    "jsonld": fetch_jsonld,
}
USER_AGENT = "job-tracker personal tool (one check per day)"


def make_client() -> PoliteClient:
    """The only HTTP client the collector uses: obeys robots.txt and paces requests."""
    return PoliteClient(httpx.Client(), USER_AGENT)  # redirects are followed by the gate itself, one checked step at a time
PAUSE_SECONDS = 1.0
RETRY_PAUSE_SECONDS = 5.0


@dataclass
class RunResult:
    new_matched: list[Role] = field(default_factory=list)
    failures: list[tuple[str, str]] = field(default_factory=list)
    total_seen: int = 0
    queue_error: str | None = None


def _host_key(source: Source) -> str:
    return "eu-lever" if source.board.startswith("eu:") else source.kind


def _fetch(adapter, client, source, sleep) -> list[Role]:
    try:
        return adapter(client, source)
    except SourceError as exc:
        if exc.status == 429 or exc.status is None or exc.status >= 500:
            sleep(RETRY_PAUSE_SECONDS)
            return adapter(client, source)  # one retry, then the error goes up
        raise


def run_collection(
    sources: list[Source],
    rules: Rules,
    store: Store,
    client: httpx.Client,
    now: datetime,
    sleep: Callable[[float], None],
    adapters: dict[str, Callable] | None = None,
) -> RunResult:
    adapters = adapters or ADAPTERS
    result = RunResult()
    called_hosts: set[str] = set()
    for source in sources:
        host = _host_key(source)
        if host in called_hosts:
            sleep(PAUSE_SECONDS)
        called_hosts.add(host)
        try:
            roles = _fetch(adapters[source.kind], client, source, sleep)
        except Exception as exc:  # one broken source must never stop the others
            message = str(exc) or type(exc).__name__
            store.record_run(source.name, False, 0, message, now)
            result.failures.append((source.name, message))
            continue
        roles = [replace(r, url=safe_url(r.url)) for r in roles]
        result.total_seen += len(roles)
        if not roles:
            store.record_run(source.name, True, 0, "empty list returned, roles not closed", now)
            continue
        # Only roles in the owner's regions are stored, so a long source list cannot flood the database.
        kept = [r for r in roles if in_region(r, rules)]
        matched = {r.key: matches(r, rules) for r in kept}
        tags = {r.key: (tag_field(r, rules), tag_level(r, rules)) for r in kept}
        new_roles = store.upsert_roles(kept, matched, tags, now)
        result.new_matched.extend(r for r in new_roles if matched[r.key])
        store.close_missing(roles[0].source, source.name, {r.source_id for r in kept}, now)
        store.record_run(source.name, True, len(kept), None, now)
    try:
        store.queue_scout_tasks(result.new_matched, now)
    except Exception as exc:  # the daily collection and the email must never depend on Scouting
        result.queue_error = str(exc) or type(exc).__name__
    return result


def load_all_sources(root: Path) -> list[Source]:
    """The hand made list first, then the board finder's list. A board in both is read once."""
    sources = load_sources(root / "sources.yaml")
    generated = root / "sources.generated.yaml"
    if generated.exists():
        seen = {(s.kind, s.board.lower()) for s in sources}
        for s in load_sources(generated):
            if (s.kind, s.board.lower()) not in seen:
                sources.append(s)
                seen.add((s.kind, s.board.lower()))
    return sources


def check_supabase_url(raw: str) -> str:
    """The secret must be the project's API address. A dashboard link or a path on the end gives web pages, not data."""
    url = raw.strip().rstrip("/")
    if not re.fullmatch(r"https://[a-z0-9]+\.supabase\.co", url):
        raise SystemExit(
            "SUPABASE_URL must look like https://YOUR-PROJECT-ID.supabase.co with nothing after .co "
            "(Supabase, Project Settings, Data API, Project URL). It is not the dashboard link."
        )
    return url


_ADDRESS = r"[^\s<>@\"',;]+@[^\s<>@\"',;]+\.[^\s<>@\"',;]+"


def check_email_setting(name: str, raw: str) -> str:
    """An email setting must be one address, or Name <address>. A wrong one is caught now, not after a long run."""
    value = raw.strip()
    if not re.fullmatch(rf"{_ADDRESS}|[^<>]+ <{_ADDRESS}>", value):
        raise SystemExit(
            f"{name} must be a single address like email@example.com (or Name <email@example.com>), "
            "with no quotes and no spaces. Check the secret in GitHub, Settings, Secrets and variables, Actions."
        )
    return value


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def main() -> int:
    import resend
    from supabase import create_client

    from jobtracker.notify import deliver

    check_email_setting("ALERT_EMAIL_TO", os.environ.get("ALERT_EMAIL_TO", ""))
    check_email_setting("ALERT_EMAIL_FROM", os.environ.get("ALERT_EMAIL_FROM", ""))
    root = repo_root()
    sources = load_all_sources(root)
    rules = load_rules(root / "rules.yaml")
    db = create_client(check_supabase_url(os.environ["SUPABASE_URL"]), os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    http = make_client()
    try:
        result = run_collection(sources, rules, Store(db), http, datetime.now(timezone.utc), time.sleep)
    finally:
        http.client.close()
    resend.api_key = os.environ["RESEND_API_KEY"]
    print(f"seen {result.total_seen}, new matched {len(result.new_matched)}, failed {len(result.failures)}")
    if result.queue_error:
        print(f"scouting task not queued: {result.queue_error}")
    try:
        deliver(result, os.environ.get("DASHBOARD_URL", ""), resend.Emails.send)
    except Exception as exc:  # the roles are already saved, so say so plainly instead of dumping a traceback
        print(f"roles were saved, but the email was not sent: {exc}")
        return 1
    return 1 if sources and len(result.failures) == len(sources) else 0


if __name__ == "__main__":
    sys.exit(main())
