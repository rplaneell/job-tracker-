from __future__ import annotations

import os
from html import escape
from typing import Callable

from jobtracker.adapters import safe_url
from jobtracker.run import RunResult


def build_digest(result: RunResult, dashboard_url: str) -> tuple[str, str] | None:
    if not result.new_matched and not result.failures:
        return None
    parts = []
    by_city: dict[str, list] = {}
    for role in result.new_matched:
        by_city.setdefault(role.city or "Other", []).append(role)
    for city, roles in by_city.items():
        parts.append(f"<h3>{escape(city)}</h3><ul>")
        for r in roles:
            link = safe_url(r.url)
            title = f'<a href="{escape(link, quote=True)}">{escape(r.title)}</a>' if link else escape(r.title)
            parts.append(f"<li>{title} at {escape(r.company)}</li>")
        parts.append("</ul>")
    if result.failures:
        parts.append("<h3>Sources that failed</h3><ul>")
        for name, error in result.failures:
            parts.append(f"<li>{escape(name)}: {escape(error)}</li>")
        parts.append("</ul>")
    parts.append(f'<p><a href="{escape(dashboard_url, quote=True)}">Open the dashboard</a></p>')
    if result.new_matched:
        top = max(by_city, key=lambda c: len(by_city[c]))
        subject = f"{len(result.new_matched)} new roles: {top}"
    else:
        subject = f"{len(result.failures)} sources failed"
    return subject, "".join(parts)


def send_digest(subject: str, html_body: str, sender: Callable[[dict], object]) -> None:
    sender(
        {
            "from": os.environ["ALERT_EMAIL_FROM"],
            "to": [os.environ["ALERT_EMAIL_TO"]],
            "subject": subject,
            "html": html_body,
        }
    )


def deliver(result: RunResult, dashboard_url: str, sender: Callable[[dict], object]) -> bool:
    """Send the digest if there is anything to say. Returns whether an email went out."""
    digest = build_digest(result, dashboard_url)
    if digest is None:
        return False
    send_digest(digest[0], digest[1], sender)
    return True
