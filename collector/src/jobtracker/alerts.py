"""Roles from LinkedIn job alert emails.

LinkedIn does not allow automated reading of its site, so nothing here touches LinkedIn. The owner's own alert emails are
read by Claude Code (with the owner's Gmail connected), which hands the roles it found to this tool. Everything in an email
is untrusted text: links are cut down to the plain job page, text is cleaned and limited, and nothing is ever run or followed.

    python -m jobtracker.alerts add --file roles.json     (or --file - to read the list from standard input)

The list is JSON: [{"title": ..., "company": ..., "location": ..., "url": ...}, ...]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlsplit

from jobtracker.adapters.locations import parse_location
from jobtracker.models import Role
from jobtracker.rules import Rules, in_region, load_rules, matches, tag_field, tag_level
from jobtracker.store import Store

ALERT_SOURCE = "linkedin_alert"
AGENT_ID = "scout"
MAX_ITEMS = 200
MAX_TEXT = 200
_JOB_PATH = re.compile(r"/(?:comm/)?jobs/view/(?:[a-z0-9%]+-)*?(\d{1,20})/?")
_CONTROL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


class AlertRejected(ValueError):
    """The whole batch is refused, for example because it is far larger than any alert email."""


def _text(value: Any, limit: int = MAX_TEXT) -> str | None:
    if not isinstance(value, str):
        return None
    s = " ".join(_CONTROL.sub("", value.replace("\t", " ").replace("\r", " ").replace("\n", " ")).split())
    return s if 0 < len(s) <= limit else None


def _job_id(url: Any) -> str | None:
    """The job number of a LinkedIn job page link, or None for anything else."""
    if not isinstance(url, str):
        return None
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or not (host == "linkedin.com" or host.endswith(".linkedin.com")):
        return None
    m = _JOB_PATH.fullmatch(parts.path.lower())
    return m.group(1) if m else None


def clean_alert_roles(items: Any) -> tuple[list[Role], dict[str, int]]:
    """Valid roles from the list, and how many items were dropped for each reason."""
    if not isinstance(items, list):
        raise AlertRejected("the roles must be a JSON list")
    if len(items) > MAX_ITEMS:
        raise AlertRejected(f"more than {MAX_ITEMS} roles in one batch")
    roles: list[Role] = []
    dropped: dict[str, int] = {}
    seen: set[str] = set()

    def drop(reason: str) -> None:
        dropped[reason] = dropped.get(reason, 0) + 1

    for item in items:
        if not isinstance(item, dict):
            drop("bad text")
            continue
        title, company = _text(item.get("title")), _text(item.get("company"))
        if title is None or company is None:
            drop("bad text")
            continue
        job_id = _job_id(item.get("url"))
        if job_id is None:
            drop("bad link")
            continue
        if job_id in seen:
            drop("duplicate")
            continue
        seen.add(job_id)
        location = _text(item.get("location")) or ""
        city, country, remote = parse_location(location)
        roles.append(Role(ALERT_SOURCE, job_id, company, title, f"https://www.linkedin.com/jobs/view/{job_id}/", location, city, country, remote, "", None))
    return roles, dropped


def add_alerts(db: Any, items: Any, rules: Rules, now: datetime) -> dict:
    """Stores the roles that are in the owner's regions and queues the ones that fit the profile for Scouting."""
    roles, dropped = clean_alert_roles(items)
    kept = [r for r in roles if in_region(r, rules)]
    if len(roles) != len(kept):
        dropped["outside your regions"] = len(roles) - len(kept)
    matched = {r.key: matches(r, rules) for r in kept}
    tags = {r.key: (tag_field(r, rules), tag_level(r, rules)) for r in kept}
    store = Store(db)
    new = store.upsert_roles(kept, matched, tags, now) if kept else []
    queued = store.queue_scout_tasks([r for r in new if matched[r.key]], now) if new else 0
    summary = {"received": len(items), "stored_new": len(new), "queued_for_scouting": queued, "dropped": dropped}
    # Counts only: job text never goes into the audit log.
    db.table("audit_log").insert({"agent_id": AGENT_ID, "action": "alerts_add", "detail": summary}).execute()
    return summary


def main(argv: list[str] | None = None, client: Any = None, now: datetime | None = None, out: Callable[[str], None] = print, stdin: Any = None) -> int:
    p = argparse.ArgumentParser(prog="jobtracker.alerts")
    sub = p.add_subparsers(dest="command", required=True)
    add = sub.add_parser("add")
    add.add_argument("--file", required=True)
    args = p.parse_args(argv)
    now = now or datetime.now(timezone.utc)
    try:
        raw = (stdin or sys.stdin).read() if args.file == "-" else Path(args.file).read_text()
        items = json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        out(json.dumps({"error": f"could not read the roles: {type(exc).__name__}"}))
        return 2
    if client is None:  # pragma: no cover - needs the real database
        from supabase import create_client

        from jobtracker.run import check_supabase_url, repo_root

        client = create_client(check_supabase_url(os.environ["SUPABASE_URL"]), os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        from jobtracker.run import repo_root

        out(json.dumps(add_alerts(client, items, load_rules(repo_root() / "rules.yaml"), now)))
        return 0
    except AlertRejected as exc:
        out(json.dumps({"error": str(exc)}))
        return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
