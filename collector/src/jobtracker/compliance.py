from __future__ import annotations

import ipaddress
import time
from typing import Callable
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import httpx

from jobtracker.adapters import SourceError

PAUSE_SECONDS = 1.0
MAX_REDIRECTS = 3
REDIRECT_STATUSES = (301, 302, 303, 307, 308)

# Hosts whose vendor documents the API as public for programs to read, but which do not serve a
# robots.txt file (the request answers 401). RFC 9309 treats an unavailable robots file as
# "allowed". An explicit Disallow, a 403 or a server error on these hosts still blocks.
# Owner approved this exception on 2026-11-18. Add a host only after reading its documentation.
DOCUMENTED_PUBLIC_API_HOSTS = frozenset({"api.ashbyhq.com"})


class PoliteClient:
    """Wraps httpx.Client: obeys robots.txt and waits between calls to the same host."""

    def __init__(
        self,
        client: httpx.Client,
        user_agent: str,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.client = client
        self.user_agent = user_agent
        self.agent_token = user_agent.split("/")[0].split(" ")[0]
        self.sleep = sleep
        self.clock = clock
        self._robots: dict[str, RobotFileParser | None] = {}
        self._last: dict[str, float] = {}

    def _pace(self, host: str) -> None:
        last = self._last.get(host)
        if last is not None:
            wait = PAUSE_SECONDS - (self.clock() - last)
            if wait > 0:
                self.sleep(wait)
        self._last[host] = self.clock()

    def _raw_get(self, url: str, follow_redirects: bool = False, **kwargs) -> httpx.Response:
        headers = {"User-Agent": self.user_agent, **kwargs.pop("headers", {})}
        return self.client.get(url, headers=headers, follow_redirects=follow_redirects, **kwargs)

    def _load_robots(self, scheme: str, host: str) -> RobotFileParser | None:
        """None means: treat the whole site as disallowed for this run."""
        if host in self._robots:
            return self._robots[host]
        parser: RobotFileParser | None
        try:
            response = self._raw_get(f"{scheme}://{host}/robots.txt", follow_redirects=True, timeout=20)
            if response.status_code == 200:
                parser = RobotFileParser()
                parser.parse(response.text.splitlines())
            elif response.status_code in (404, 410) or (
                response.status_code == 401 and host in DOCUMENTED_PUBLIC_API_HOSTS
            ):
                parser = RobotFileParser()
                parser.parse([])  # no rules means everything is allowed
            else:
                parser = None  # 401, 403, 429, 5xx and anything else: stay out
        except httpx.HTTPError:
            parser = None
        self._last[host] = self.clock()
        self._robots[host] = parser
        return parser

    @staticmethod
    def _safe_redirect(target: str) -> bool:
        """Only https to a named host. Plain http, IP addresses and localhost are never followed."""
        parts = urlsplit(target)
        host = (parts.hostname or "").lower()
        if parts.scheme != "https" or not host or host == "localhost" or host.endswith(".localhost"):
            return False
        try:
            ipaddress.ip_address(host)
        except ValueError:
            return True
        return False

    def get(self, url: str, **kwargs) -> httpx.Response:
        """Fetches a page. A redirect is followed here, one step at a time, so every host it leads to passes robots.txt and pacing."""
        for _ in range(MAX_REDIRECTS + 1):
            parts = urlsplit(url)
            host = parts.netloc
            robots = self._load_robots(parts.scheme, host)
            if robots is None or not robots.can_fetch(self.agent_token, url):
                raise SourceError(f"disallowed by robots.txt: {url}")
            self._pace(host)
            response = self._raw_get(url, **kwargs)
            location = response.headers.get("location")
            if response.status_code not in REDIRECT_STATUSES or not location:
                return response
            target = urljoin(url, location)
            if not self._safe_redirect(target):
                raise SourceError(f"redirect refused (only https to a named host is followed): {url}")
            url = target
        raise SourceError(f"too many redirects: {url}")
