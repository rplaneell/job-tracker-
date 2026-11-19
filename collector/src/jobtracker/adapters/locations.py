from __future__ import annotations

import re
import unicodedata

CITIES = {
    "barcelona": "Spain", "madrid": "Spain",
    "basel": "Switzerland", "zurich": "Switzerland", "geneva": "Switzerland",
    "zug": "Switzerland", "bern": "Switzerland", "lausanne": "Switzerland",
    "brussels": "Belgium", "antwerp": "Belgium", "ghent": "Belgium", "leuven": "Belgium",
    "amsterdam": "Netherlands", "rotterdam": "Netherlands", "utrecht": "Netherlands",
    "the hague": "Netherlands", "eindhoven": "Netherlands", "leiden": "Netherlands",
    "copenhagen": "Denmark", "aarhus": "Denmark", "odense": "Denmark",
}
COUNTRIES = {
    "spain": "Spain", "switzerland": "Switzerland", "schweiz": "Switzerland",
    "belgium": "Belgium", "netherlands": "Netherlands", "the netherlands": "Netherlands",
    "denmark": "Denmark",
    "united states": "United States", "usa": "United States", "u.s.a.": "United States", "u.s.": "United States",
}
# Two letter US state codes. DE (Delaware) is left out on purpose: in a posting it is far more often Germany.
US_STATES = frozenset(
    "AL AK AZ AR CA CO CT DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split()
)
_CITY_STATE = re.compile(r"(?:^|[,;/]\s*|\s-\s)([A-Z][\w.'\- ]*?),\s*([A-Z]{2})(?![\w])")


def _ascii(text: str) -> str:
    folded = unicodedata.normalize("NFKD", text)
    return "".join(c for c in folded if not unicodedata.combining(c)).lower()


def _find(table: dict[str, str], text: str) -> list[tuple[int, str]]:
    hits = []
    for name in table:
        m = re.search(rf"\b{re.escape(name)}\b", text)
        if m:
            hits.append((m.start(), name))
    return sorted(hits)


def parse_location(raw: str) -> tuple[str | None, str | None, bool | None]:
    """Return (city, country, remote). Unknown text gives no city and no country."""
    if not raw or not raw.strip():
        return (None, None, None)
    text = _ascii(raw)
    remote = bool(re.search(r"\bremote\b", text))
    cities = _find(CITIES, text)
    if cities:
        key = cities[0][1]
        return (key.title(), CITIES[key], remote)
    for m in _CITY_STATE.finditer(raw):
        if m.group(2) in US_STATES:
            return (m.group(1).strip(), "United States", remote)
    countries = _find(COUNTRIES, text)
    if countries:
        return (None, COUNTRIES[countries[0][1]], remote)
    return (None, None, remote)
