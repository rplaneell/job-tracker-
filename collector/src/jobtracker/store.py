from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from jobtracker.models import Role

Key = tuple[str, str]

SCOUT_TASK_SIZE = 50  # roles in one Scouting task


def _rows(data: Any) -> list[dict]:
    """A read must come back as a list of rows. Anything else (such as an error payload) is reported in plain words."""
    if not isinstance(data, list):
        shown = json.dumps(data, default=str)[:300]
        raise RuntimeError(f"unexpected reply from the database (expected a list of rows): {shown}")
    return data


class Store:
    """Reads and writes roles. Never touches the applications table."""

    def __init__(self, client: Any) -> None:
        self.client = client

    def upsert_roles(
        self,
        roles: list[Role],
        matched: dict[Key, bool],
        tags: dict[Key, tuple[str | None, str | None]],
        now: datetime,
    ) -> list[Role]:
        existing = self._existing_keys(roles)  # key -> was it kept before this run
        new_rows, old_rows, new_roles = [], [], []
        for role in roles:
            field_tag, level_tag = tags.get(role.key, (None, None))
            row = {
                "source": role.source,
                "source_id": role.source_id,
                "company": role.company,
                "title": role.title,
                "url": role.url,
                "location_raw": role.location_raw,
                "city": role.city,
                "country": role.country,
                "remote": role.remote,
                "description": role.description,
                "posted_at": role.posted_at.isoformat() if role.posted_at else None,
                "field_tag": field_tag,
                "level_tag": level_tag,
                "matched": matched.get(role.key, False),
                "status": "open",
                "last_seen": now.isoformat(),
            }
            if role.key in existing:
                old_rows.append(row)  # first_seen is left out so it is kept
                if row["matched"] and not existing[role.key]:
                    new_roles.append(role)  # already stored, but the rules now keep it, so Scouting must see it
            else:
                new_rows.append({**row, "first_seen": now.isoformat()})
                new_roles.append(role)
        for batch in (new_rows, old_rows):
            if batch:
                self.client.table("roles").upsert(batch, on_conflict="source,source_id").execute()
        return new_roles

    def _existing_keys(self, roles: list[Role]) -> dict[Key, bool]:
        found: dict[Key, bool] = {}
        for source in {r.source for r in roles}:
            ids = [r.source_id for r in roles if r.source == source]
            for start in range(0, len(ids), 100):
                rows = (
                    self.client.table("roles")
                    .select("source,source_id,matched")
                    .eq("source", source)
                    .in_("source_id", ids[start : start + 100])
                    .execute()
                    .data
                )
                rows = _rows(rows)
                found.update({(r["source"], r["source_id"]): bool(r.get("matched")) for r in rows})
        return found

    def close_missing(self, source: str, company: str, seen_ids: set[str], now: datetime) -> int:
        open_rows = (
            self.client.table("roles")
            .select("source_id")
            .eq("source", source)
            .eq("company", company)
            .eq("status", "open")
            .execute()
            .data
        )
        open_rows = _rows(open_rows)
        missing = [r["source_id"] for r in open_rows if r["source_id"] not in seen_ids]
        if missing:
            self.client.table("roles").update({"status": "closed"}).eq("source", source).eq(
                "company", company
            ).in_("source_id", missing).execute()
        return len(missing)

    def record_run(self, source_name: str, ok: bool, role_count: int, error: str | None, now: datetime) -> None:
        self.client.table("source_runs").insert(
            {
                "source_name": source_name,
                "ran_at": now.isoformat(),
                "ok": ok,
                "role_count": role_count,
                "error": error,
            }
        ).execute()

    def queue_scout_tasks(self, roles: list[Role], now: datetime) -> int:
        """Queues Scouting work for new matched roles. Returns how many roles were queued."""
        ids: list[str] = []
        for source in sorted({r.source for r in roles}):
            wanted = [r.source_id for r in roles if r.source == source]
            for start in range(0, len(wanted), 100):
                rows = (
                    self.client.table("roles")
                    .select("id,source_id")
                    .eq("source", source)
                    .in_("source_id", wanted[start : start + 100])
                    .execute()
                    .data
                )
                ids.extend(r["id"] for r in _rows(rows))
        tasks = [
            {
                "agent_id": "scout",
                "kind": "review_new_roles",
                "status": "queued",
                "payload": {"role_ids": ids[start : start + SCOUT_TASK_SIZE]},
                "created_at": now.isoformat(),
            }
            for start in range(0, len(ids), SCOUT_TASK_SIZE)
        ]
        if tasks:
            self.client.table("agent_tasks").insert(tasks).execute()
        return len(ids)
