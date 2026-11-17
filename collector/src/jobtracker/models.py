from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Role:
    source: str
    source_id: str
    company: str
    title: str
    url: str
    location_raw: str
    city: str | None
    country: str | None
    remote: bool | None
    description: str
    posted_at: datetime | None

    @property
    def key(self) -> tuple[str, str]:
        return (self.source, self.source_id)
