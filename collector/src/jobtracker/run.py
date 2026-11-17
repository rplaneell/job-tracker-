from __future__ import annotations

import os
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import httpx

from jobtracker.adapters import SourceError
from jobtracker.adapters.ashby import fetch_ashby
from jobtracker.adapters.greenhouse import fetch_greenhouse
from jobtracker.adapters.lever import fetch_lever
from jobtracker.models import Role
from jobtracker.registry import Source, load_sources
from jobtracker.rules import Rules, load_rules, matches, tag_field, tag_level
from jobtracker.store import Store

ADAPTERS: dict[str, Callable[[httpx.Client, Source], list[Role]]] = {
    "greenhouse": fetch_greenhouse,
    "lever": fetch_lever,
    "ashby": fetch_ashby,
}
USER_AGENT = "job-tracker personal tool (one check per day)"
PAUSE_SECONDS = 1.0
RETRY_PAUSE_SECONDS = 5.0


@dataclass
class RunResult:
    new_matched: list[Role] = field(default_factory=list)
    failures: list[tuple[str, str]] = field(default_factory=list)
    total_seen: int = 0


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
        result.total_seen += len(roles)
        if not roles:
            store.record_run(source.name, True, 0, "empty list returned, roles not closed", now)
            continue
        matched = {r.key: matches(r, rules) for r in roles}
        tags = {r.key: (tag_field(r, rules), tag_level(r, rules)) for r in roles}
        new_roles = store.upsert_roles(roles, matched, tags, now)
        result.new_matched.extend(r for r in new_roles if matched[r.key])
        store.close_missing(roles[0].source, source.name, {r.source_id for r in roles}, now)
        store.record_run(source.name, True, len(roles), None, now)
    return result


def main() -> int:
    from supabase import create_client

    root = Path(__file__).resolve().parents[3].parent
    sources = load_sources(root / "sources.yaml")
    rules = load_rules(root / "rules.yaml")
    db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    with httpx.Client(headers={"User-Agent": USER_AGENT}, follow_redirects=True) as http:
        result = run_collection(sources, rules, Store(db), http, datetime.now(timezone.utc), time.sleep)
    print(f"seen {result.total_seen}, new matched {len(result.new_matched)}, failed {len(result.failures)}")
    return 1 if sources and len(result.failures) == len(sources) else 0


if __name__ == "__main__":
    sys.exit(main())
