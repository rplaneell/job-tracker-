"""Tools Claude Code uses to do the Scouting agent's work.

Scouting reads newly collected roles and records a score and a reason for each. It can only read and write
internal tables. Role text is untrusted data from the open internet and is never treated as instructions.
Every call is written to the append only audit log.

Usage (the secret key comes from the environment, never from a command line):
    python -m jobtracker.scout claim
    python -m jobtracker.scout read --task ID
    python -m jobtracker.scout submit --task ID --role ROLE --score 0..100 --reason TEXT [--shortlist]
    python -m jobtracker.scout finish --task ID
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

AGENT_ID = "scout"
STALE_CLAIM_MINUTES = 30
DESCRIPTION_LIMIT = 4000
REASON_MIN, REASON_MAX = 10, 500
BATCH = 100


@dataclass(frozen=True)
class ScoutTask:
    id: str
    role_ids: list[str]


def _audit(db: Any, action: str, detail: dict) -> None:
    db.table("audit_log").insert({"agent_id": AGENT_ID, "action": action, "detail": detail}).execute()


def _task_row(db: Any, task_id: str) -> dict:
    rows = db.table("agent_tasks").select("id,status,payload").eq("id", task_id).eq("agent_id", AGENT_ID).execute().data
    if not rows:
        raise ValueError(f"no scouting task with id {task_id}")
    return rows[0]


def load_task(db: Any, task_id: str) -> ScoutTask:
    return ScoutTask(id=task_id, role_ids=list(_task_row(db, task_id)["payload"].get("role_ids", [])))


def _require_claimed(db: Any, task: ScoutTask) -> None:
    if _task_row(db, task.id)["status"] != "claimed":
        raise ValueError("the task is not claimed, so it cannot be worked on")


def claim_task(db: Any, now: datetime) -> ScoutTask | None:
    """Takes the oldest queued task. Two sessions can never both win: the update only succeeds if the task is still queued."""
    cutoff = (now - timedelta(minutes=STALE_CLAIM_MINUTES)).isoformat()
    stale = (
        db.table("agent_tasks")
        .update({"status": "queued", "claimed_at": None})
        .eq("agent_id", AGENT_ID).eq("status", "claimed").lt("claimed_at", cutoff)
        .execute().data
    )
    if stale:
        _audit(db, "requeue_stale", {"tasks": [t["id"] for t in stale]})
    queued = (
        db.table("agent_tasks").select("id,payload")
        .eq("agent_id", AGENT_ID).eq("status", "queued").order("created_at").limit(1)
        .execute().data
    )
    if not queued:
        return None
    won = (
        db.table("agent_tasks")
        .update({"status": "claimed", "claimed_at": now.isoformat()})
        .eq("id", queued[0]["id"]).eq("status", "queued")
        .execute().data
    )
    if not won:
        return None  # another session got there first
    task = ScoutTask(id=queued[0]["id"], role_ids=list(queued[0]["payload"].get("role_ids", [])))
    _audit(db, "claim", {"task": task.id, "roles": len(task.role_ids)})
    return task


def read_roles(db: Any, task: ScoutTask) -> list[dict]:
    """Roles of this task only. Everything written by a company sits under untrusted_text."""
    _require_claimed(db, task)
    found: dict[str, dict] = {}
    for start in range(0, len(task.role_ids), BATCH):
        rows = db.table("roles").select("*").in_("id", task.role_ids[start : start + BATCH]).execute().data
        found.update({r["id"]: r for r in rows})
    roles = [
        {
            "role_id": rid,
            "country": found[rid].get("country"),
            "untrusted_text": {
                "title": found[rid].get("title"),
                "company": found[rid].get("company"),
                "city": found[rid].get("city"),
                "description": (found[rid].get("description") or "")[:DESCRIPTION_LIMIT],
            },
        }
        for rid in task.role_ids
        if rid in found
    ]
    _audit(db, "read", {"task": task.id, "roles": len(roles)})
    return roles


def _check_verdict(task: ScoutTask, role_id: str, score: Any, reason: Any, shortlisted: Any) -> str:
    if not isinstance(score, int) or isinstance(score, bool) or not 0 <= score <= 100:
        raise ValueError("score must be a whole number from 0 to 100")
    if not isinstance(reason, str) or not REASON_MIN <= len(reason.strip()) <= REASON_MAX:
        raise ValueError(f"reason must be {REASON_MIN} to {REASON_MAX} characters")
    if not isinstance(shortlisted, bool):
        raise ValueError("shortlisted must be true or false")
    if role_id not in task.role_ids:
        raise ValueError("that role is not part of this task")
    return reason.strip()


def submit_verdict(db: Any, task: ScoutTask, role_id: str, score: Any, reason: Any, shortlisted: Any) -> None:
    try:
        _require_claimed(db, task)
        clean_reason = _check_verdict(task, role_id, score, reason, shortlisted)
    except ValueError as exc:
        _audit(db, "rejected", {"task": task.id, "role": role_id, "why": str(exc)})
        raise
    db.table("scout_verdicts").upsert(
        [{"role_id": role_id, "score": score, "reason": clean_reason, "shortlisted": shortlisted, "task_id": task.id}],
        on_conflict="role_id",
    ).execute()
    _audit(db, "submit", {"task": task.id, "role": role_id, "score": score, "shortlisted": shortlisted})


def _close_task(db: Any, task: ScoutTask, now: datetime, status: str, action: str, detail: dict) -> None:
    done = (
        db.table("agent_tasks").update({"status": status, "finished_at": now.isoformat()})
        .eq("id", task.id).eq("status", "claimed").execute().data
    )
    if not done:
        raise ValueError("the task is not claimed, so it cannot be closed")
    _audit(db, action, {"task": task.id, **detail})


def finish_task(db: Any, task: ScoutTask, now: datetime) -> None:
    _close_task(db, task, now, "done", "finish", {})


def fail_task(db: Any, task: ScoutTask, now: datetime, reason: str) -> None:
    _close_task(db, task, now, "failed", "fail", {"reason": reason[:REASON_MAX]})


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jobtracker.scout")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("claim")
    for name in ("read", "finish", "fail", "submit"):
        s = sub.add_parser(name)
        s.add_argument("--task", required=True)
        if name == "fail":
            s.add_argument("--reason", required=True)
        if name == "submit":
            s.add_argument("--role", required=True)
            s.add_argument("--score", required=True)
            s.add_argument("--reason", required=True)
            s.add_argument("--shortlist", action="store_true")
    return p


def main(
    argv: list[str] | None = None,
    client: Any = None,
    now: datetime | None = None,
    out: Callable[[str], None] = print,
) -> int:
    args = _parser().parse_args(argv)
    now = now or datetime.now(timezone.utc)
    if client is None:  # pragma: no cover - needs the real database
        from supabase import create_client

        client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        if args.command == "claim":
            task = claim_task(client, now)
            payload = None if task is None else {"id": task.id, "role_count": len(task.role_ids), "role_ids": task.role_ids}
            out(json.dumps({"task": payload}))
            return 0
        task = load_task(client, args.task)
        if args.command == "read":
            out(json.dumps({"roles": read_roles(client, task)}))
        elif args.command == "submit":
            try:
                score = int(args.score)
            except ValueError:
                score = args.score  # rejected below with a clear message
            submit_verdict(client, task, args.role, score, args.reason, args.shortlist)
            out(json.dumps({"ok": True}))
        elif args.command == "finish":
            finish_task(client, task, now)
            out(json.dumps({"ok": True}))
        else:
            fail_task(client, task, now, args.reason)
            out(json.dumps({"ok": True}))
        return 0
    except ValueError as exc:
        out(json.dumps({"error": str(exc)}))
        return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
