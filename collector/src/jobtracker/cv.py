"""Tools Claude Code uses to tailor the owner's master CV to one role.

The one rule: a tailored CV may only select, reorder and reword what is in the master CV. Employers, schools, degrees,
dates and contact details are copied from the master by this program and can never be typed by the model. A reworded
line may not add a number, or a name, that is not in the original. The role text is untrusted data from the internet.

The audit log holds ids, counts and rule codes only, never CV text. Every version starts as a draft that the owner
approves in the dashboard. Nothing is sent anywhere.

    python -m jobtracker.cv claim
    python -m jobtracker.cv read --task ID
    python -m jobtracker.cv submit --task ID --file version.json        (use --file - to read standard input)
    python -m jobtracker.cv finish --task ID | fail --task ID --reason TEXT
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

AGENT_ID = "cv"
STALE_CLAIM_MINUTES = 30
DESCRIPTION_LIMIT = 4000
BULLET_MIN, BULLET_MAX, SUMMARY_MAX = 10, 400, 1200
TOP_KEYS = {"summary", "education", "experience", "skills", "languages"}


class CvRejected(ValueError):
    """The tailored version broke a rule. `code` is the rule (safe to log); the message says what to fix."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class CvTask:
    id: str
    role_id: str


# ---- the truthfulness rules -------------------------------------------------------------------------------------

_NUMBER = re.compile(r"\d+(?:[.,]\d+)*")
_WORD = re.compile(r"[A-Za-z][A-Za-z0-9&+#]*")


def _numbers(text: str) -> set[str]:
    return {m.group(0).rstrip(".,") for m in _NUMBER.finditer(text)}


def _words(text: str) -> set[str]:
    return {m.group(0).lower() for m in _WORD.finditer(text)}


def _all_text(value: Any) -> str:
    """Every string anywhere inside the master CV, joined."""
    if isinstance(value, str):
        return value + "\n"
    if isinstance(value, dict):
        return "".join(_all_text(v) for v in value.values())
    if isinstance(value, list):
        return "".join(_all_text(v) for v in value)
    return ""


def _check_text(where: str, text: Any, source_text: str, known_words: set[str], low: int, high: int) -> str:
    if not isinstance(text, str):
        raise CvRejected("type", f"{where}: the text must be a string.")
    text = text.strip()
    if not low <= len(text) <= high:
        raise CvRejected("length", f"{where}: the text must be {low} to {high} characters.")
    new_numbers = _numbers(text) - _numbers(source_text)
    if new_numbers:
        raise CvRejected("new_number", f"{where}: the number {sorted(new_numbers)[0]} is not in the original text. Remove it or reword without new facts.")
    for m in _WORD.finditer(text):
        word = m.group(0)
        if len(word) < 2 or not word[0].isupper():
            continue
        before = text[: m.start()].rstrip()
        if not before or before[-1] in ".!?:;":
            continue  # a capital letter that only starts a sentence
        if word.lower() not in known_words:
            raise CvRejected("new_name", f"{where}: the name {word} is not in the master CV or in the role. Remove it or add it to the master CV first.")
    return text


def validate_tailored(master: dict, tailored: Any, role_company: str, role_title: str) -> dict:
    """Returns the merged version, or raises CvRejected. Facts such as employers and dates come from the master only."""
    if not isinstance(tailored, dict):
        raise CvRejected("shape", "The version must be a JSON object.")
    unknown = set(tailored) - TOP_KEYS
    if unknown:
        raise CvRejected("unknown_field", f"Unknown field {sorted(unknown)[0]}. Allowed: summary, education, experience, skills, languages.")

    master_text = _all_text(master)
    known = _words(master_text) | _words(role_company or "") | _words(role_title or "")

    summary = master.get("summary", "")
    if "summary" in tailored:
        summary = _check_text("summary", tailored["summary"], master_text, known, 0, SUMMARY_MAX)

    merged: dict[str, Any] = {k: master.get(k, "" if k != "links" else []) for k in ("name", "email", "phone", "location", "links")}
    merged["summary"] = summary

    for section in ("education", "experience"):
        chosen = tailored.get(section, [])
        if not isinstance(chosen, list):
            raise CvRejected("shape", f"{section} must be a list.")
        master_entries = {e["id"]: e for e in master.get(section, [])}
        seen: set[str] = set()
        out = []
        for item in chosen:
            if not isinstance(item, dict):
                raise CvRejected("shape", f"Each {section} entry must be an object with an id and bullets.")
            extra = set(item) - {"id", "bullets"}
            if extra:
                raise CvRejected("unknown_field", f"{section} entries may only have id and bullets, not {sorted(extra)[0]}. The program copies employer, title and dates from the master CV.")
            eid = item.get("id")
            if eid not in master_entries:
                raise CvRejected("unknown_id", f"{section}: there is no entry with id {eid!r} in the master CV.")
            if eid in seen:
                raise CvRejected("duplicate", f"{section}: entry {eid} is used twice.")
            seen.add(eid)
            source = master_entries[eid]
            source_bullets = {b["id"]: b for b in source.get("bullets", [])}
            bullets = item.get("bullets", [])
            if not isinstance(bullets, list):
                raise CvRejected("shape", f"{eid}: bullets must be a list.")
            used: set[str] = set()
            new_bullets = []
            for b in bullets:
                if not isinstance(b, dict) or set(b) - {"id", "text"}:
                    raise CvRejected("shape", f"{eid}: each bullet must be an object with only id and text.")
                bid = b.get("id")
                if bid not in source_bullets:
                    raise CvRejected("unknown_id", f"{eid}: there is no bullet {bid!r} under this entry in the master CV.")
                if bid in used:
                    raise CvRejected("duplicate", f"{eid}: bullet {bid} is used twice.")
                used.add(bid)
                text = _check_text(bid, b.get("text"), source_bullets[bid]["text"], known, BULLET_MIN, BULLET_MAX)
                new_bullets.append({"id": bid, "text": text})
            out.append({"id": eid, "org": source["org"], "title": source["title"], "dates": source["dates"], "bullets": new_bullets})
        merged[section] = out

    for section in ("skills", "languages"):
        chosen = tailored.get(section, [])
        if not isinstance(chosen, list):
            raise CvRejected("shape", f"{section} must be a list of ids.")
        master_items = {i["id"]: i for i in master.get(section, [])}
        out_items, seen_ids = [], set()
        for iid in chosen:
            if not isinstance(iid, str) or iid not in master_items:
                raise CvRejected("unknown_id", f"{section}: there is no item with id {iid!r} in the master CV.")
            if iid in seen_ids:
                raise CvRejected("duplicate", f"{section}: item {iid} is used twice.")
            seen_ids.add(iid)
            out_items.append({"id": iid, "text": master_items[iid]["text"]})
        merged[section] = out_items

    if not merged["education"] and not merged["experience"]:
        raise CvRejected("empty", "Include at least one education or experience entry.")
    return merged


# ---- the photo rule ----------------------------------------------------------------------------------------------


def wants_photo(role: dict) -> bool:
    """The owner's CV carries a photo only for roles in Barcelona. The program decides this, never the model."""
    if (role.get("country") or "") != "Spain":
        return False
    if (role.get("city") or "").strip().lower() == "barcelona":
        return True
    return re.search(r"(?<![\w])barcelona(?![\w])", (role.get("location_raw") or "").lower()) is not None


# ---- the tools ---------------------------------------------------------------------------------------------------

def _audit(db: Any, action: str, detail: dict) -> None:
    db.table("audit_log").insert({"agent_id": AGENT_ID, "action": action, "detail": detail}).execute()


def _task_row(db: Any, task_id: str) -> dict:
    rows = db.table("agent_tasks").select("id,status,payload").eq("id", task_id).eq("agent_id", AGENT_ID).execute().data
    if not rows:
        raise ValueError(f"no CV task with id {task_id}")
    return rows[0]


def load_task(db: Any, task_id: str) -> CvTask:
    return CvTask(id=task_id, role_id=str(_task_row(db, task_id)["payload"].get("role_id", "")))


def _require_claimed(db: Any, task: CvTask) -> None:
    if _task_row(db, task.id)["status"] != "claimed":
        raise ValueError("the task is not claimed, so it cannot be worked on")


def claim_task(db: Any, now: datetime) -> CvTask | None:
    cutoff = (now - timedelta(minutes=STALE_CLAIM_MINUTES)).isoformat()
    stale = (
        db.table("agent_tasks").update({"status": "queued", "claimed_at": None})
        .eq("agent_id", AGENT_ID).eq("status", "claimed").lt("claimed_at", cutoff).execute().data
    )
    if stale:
        _audit(db, "requeue_stale", {"tasks": [t["id"] for t in stale]})
    queued = (
        db.table("agent_tasks").select("id,payload")
        .eq("agent_id", AGENT_ID).eq("status", "queued").order("created_at").limit(1).execute().data
    )
    if not queued:
        return None
    won = (
        db.table("agent_tasks").update({"status": "claimed", "claimed_at": now.isoformat()})
        .eq("id", queued[0]["id"]).eq("status", "queued").execute().data
    )
    if not won:
        return None
    task = CvTask(id=queued[0]["id"], role_id=str(queued[0]["payload"].get("role_id", "")))
    _audit(db, "claim", {"task": task.id, "role": task.role_id})
    return task


def _master(db: Any) -> dict:
    rows = db.table("cv_master").select("content").execute().data
    if not rows:
        raise ValueError("no master CV is saved yet. Ask the owner to save one in the dashboard first.")
    return rows[0]["content"]


def _role(db: Any, role_id: str) -> dict:
    rows = db.table("roles").select("*").eq("id", role_id).execute().data
    if not rows:
        raise ValueError("the role for this task no longer exists")
    return rows[0]


def read_inputs(db: Any, task: CvTask) -> dict:
    """The master CV (the owner's own text) and the role. Everything a company wrote sits under untrusted_text."""
    _require_claimed(db, task)
    master = _master(db)
    role = _role(db, task.role_id)
    _audit(db, "read", {"task": task.id, "role": task.role_id})
    return {
        "master": master,
        "role": {
            "role_id": task.role_id,
            "country": role.get("country"),
            "untrusted_text": {
                "title": role.get("title"),
                "company": role.get("company"),
                "city": role.get("city"),
                "description": (role.get("description") or "")[:DESCRIPTION_LIMIT],
            },
        },
    }


def submit_version(db: Any, task: CvTask, tailored: Any) -> str:
    try:
        _require_claimed(db, task)
        master = _master(db)
        role = _role(db, task.role_id)
        merged = validate_tailored(master, tailored, role.get("company") or "", role.get("title") or "")
        merged["withPhoto"] = wants_photo(role)
    except CvRejected as exc:
        _audit(db, "rejected", {"task": task.id, "code": exc.code})
        raise
    version_id = str(uuid.uuid4())
    db.table("cv_versions").insert(
        {"id": version_id, "role_id": task.role_id, "content": merged, "status": "draft", "task_id": task.id}
    ).execute()
    bullets = sum(len(e["bullets"]) for s in ("education", "experience") for e in merged[s])
    _audit(db, "submit", {"task": task.id, "version": version_id, "role": task.role_id, "bullets": bullets})
    return version_id


def _close_task(db: Any, task: CvTask, now: datetime, status: str, action: str, detail: dict) -> None:
    done = (
        db.table("agent_tasks").update({"status": status, "finished_at": now.isoformat()})
        .eq("id", task.id).eq("status", "claimed").execute().data
    )
    if not done:
        raise ValueError("the task is not claimed, so it cannot be closed")
    _audit(db, action, {"task": task.id, **detail})


def finish_task(db: Any, task: CvTask, now: datetime) -> None:
    _close_task(db, task, now, "done", "finish", {})


def fail_task(db: Any, task: CvTask, now: datetime, reason: str) -> None:
    _close_task(db, task, now, "failed", "fail", {"reason": reason[:200]})


def _parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="jobtracker.cv")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("claim")
    for name in ("read", "submit", "finish", "fail"):
        s = sub.add_parser(name)
        s.add_argument("--task", required=True)
        if name == "submit":
            s.add_argument("--file", required=True)
        if name == "fail":
            s.add_argument("--reason", required=True)
    return p


def main(
    argv: list[str] | None = None,
    client: Any = None,
    now: datetime | None = None,
    out: Callable[[str], None] = print,
    stdin: str | None = None,
) -> int:
    args = _parser().parse_args(argv)
    now = now or datetime.now(timezone.utc)
    if client is None:  # pragma: no cover - needs the real database
        from supabase import create_client

        from jobtracker.run import check_supabase_url

        client = create_client(check_supabase_url(os.environ["SUPABASE_URL"]), os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    try:
        if args.command == "claim":
            task = claim_task(client, now)
            out(json.dumps({"task": None if task is None else {"id": task.id, "role_id": task.role_id}}))
            return 0
        task = load_task(client, args.task)
        if args.command == "read":
            out(json.dumps(read_inputs(client, task)))
        elif args.command == "submit":
            raw = (stdin if stdin is not None else sys.stdin.read()) if args.file == "-" else open(args.file, encoding="utf-8").read()
            try:
                tailored = json.loads(raw)
            except json.JSONDecodeError:
                raise ValueError("the version is not valid JSON") from None
            out(json.dumps({"ok": True, "version_id": submit_version(client, task, tailored)}))
        elif args.command == "finish":
            finish_task(client, task, now)
            out(json.dumps({"ok": True}))
        else:
            fail_task(client, task, now, args.reason)
            out(json.dumps({"ok": True}))
        return 0
    except ValueError as exc:  # includes CvRejected
        out(json.dumps({"error": str(exc)}))
        return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
