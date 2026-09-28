"""Polite HTTP fetching: identifies itself, obeys robots.txt, rate-limits per host, retries."""
from __future__ import annotations

import time
import urllib.robotparser
from dataclasses import dataclass
from urllib.parse import urlsplit

import httpx

from ..config import Settings


@dataclass
class Fetched:
    url: str
    status: int
    content_type: str
    content: bytes


class RobotsDisallowed(Exception):
    pass


class Fetcher:
    def __init__(self, settings: Settings, client: httpx.Client | None = None):
        ua = settings.user_agent
        if settings.crawler_contact:
            ua = f"{ua} {settings.crawler_contact}"
        self.user_agent = ua
        self.delay = settings.request_delay_seconds
        self.client = client or httpx.Client(
            headers={"User-Agent": ua, "Accept-Language": "ar,en;q=0.5"},
            timeout=settings.request_timeout_seconds, follow_redirects=True,
        )
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self._last_hit: dict[str, float] = {}

    def _robots_for(self, url: str) -> urllib.robotparser.RobotFileParser:
        parts = urlsplit(url)
        origin = f"{parts.scheme}://{parts.netloc}"
        if origin not in self._robots:
            rp = urllib.robotparser.RobotFileParser()
            try:
                r = self.client.get(origin + "/robots.txt")
                if r.status_code == 200:
                    rp.parse(r.text.splitlines())
                elif 400 <= r.status_code < 500 and r.status_code not in (401, 403):
                    rp.parse([])                                 # robots.txt absent → allowed (RFC 9309)
                else:
                    rp.parse(["User-agent: *", "Disallow: /"])   # 401/403/5xx: do not crawl
            except httpx.HTTPError:
                rp.parse(["User-agent: *", "Disallow: /"])       # unreadable robots.txt: do not crawl
            self._robots[origin] = rp
        return self._robots[origin]

    def allowed(self, url: str) -> bool:
        return self._robots_for(url).can_fetch(self.user_agent, url)

    def _throttle(self, url: str) -> None:
        host = urlsplit(url).netloc
        wait = self._last_hit.get(host, 0) + self.delay - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last_hit[host] = time.monotonic()

    def get(self, url: str, attempts: int = 3) -> Fetched:
        if not self.allowed(url):
            raise RobotsDisallowed(url)
        last_exc: Exception | None = None
        for attempt in range(attempts):
            self._throttle(url)
            try:
                r = self.client.get(url)
                if r.status_code >= 500 or r.status_code == 429:
                    raise httpx.HTTPStatusError(f"{r.status_code}", request=r.request, response=r)
                return Fetched(str(r.url), r.status_code, r.headers.get("content-type", "application/octet-stream"), r.content)
            except httpx.HTTPError as exc:
                last_exc = exc
                time.sleep(min(2 ** attempt * max(self.delay, 1), 60))
        raise last_exc  # type: ignore[misc]


def render_with_browser(url: str, user_agent: str, timeout_ms: int = 45000) -> Fetched:
    """For JavaScript-rendered portals. Requires `pip install playwright` and a Chromium build."""
    from playwright.sync_api import sync_playwright  # optional dependency

    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            page = browser.new_page(user_agent=user_agent, locale="ar-SA")
            resp = page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            html = page.content()
            return Fetched(page.url, resp.status if resp else 0, "text/html; charset=utf-8", html.encode("utf-8"))
        finally:
            browser.close()
