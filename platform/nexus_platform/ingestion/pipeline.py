"""Crawl a registered source, or import local files, into the knowledge base."""
from __future__ import annotations

import hashlib
import logging
import mimetypes
from collections import Counter, deque
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from ..config import Settings
from .fetcher import Fetched, Fetcher, RobotsDisallowed, render_with_browser
from .parsers import build_document, extract, parse_json_feed
from .registry import Source
from .store import save_raw, store_document

log = logging.getLogger(__name__)


@dataclass
class RunReport:
    source_id: str
    pages_fetched: int = 0
    counts: Counter = field(default_factory=Counter)
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        c = ", ".join(f"{k}={v}" for k, v in sorted(self.counts.items())) or "no documents"
        return f"[{self.source_id}] pages={self.pages_fetched} {c} errors={len(self.errors)}"


class SourceNotRunnable(Exception):
    pass


def crawl_source(conn: psycopg.Connection, source: Source, settings: Settings, fetcher: Fetcher | None = None,
                 max_pages: int | None = None, force: bool = False) -> RunReport:
    if source.connector != "crawler":
        raise SourceNotRunnable(f"{source.id} is file-import only (access={source.access})")
    if not source.enabled and not force:
        raise SourceNotRunnable(f"{source.id} is disabled in the registry; enable it after reviewing the site's terms")
    if not source.document_patterns:
        raise SourceNotRunnable(f"{source.id} has no document_patterns yet; run `nexus calibrate` first")

    fetcher = fetcher or Fetcher(settings)
    report = RunReport(source.id)
    limit = max_pages or source.max_pages_per_run
    queue, seen = deque(source.seeds), set(source.seeds)

    while queue and report.pages_fetched < limit:
        url = queue.popleft()
        try:
            page = _fetch(fetcher, source, url)
        except RobotsDisallowed:
            report.counts["robots_disallowed"] += 1
            continue
        except Exception as exc:  # network errors must not abort the whole run
            report.errors.append(f"{url}: {exc}")
            continue
        report.pages_fetched += 1
        if page.status >= 400:
            report.errors.append(f"{url}: HTTP {page.status}")
            continue

        external_id = source.document_id_for(page.url) or source.document_id_for(url)
        extracted = extract(page.content, page.content_type, source.selectors, base_url=page.url)
        if external_id:
            try:
                with conn.transaction():
                    raw_id = save_raw(conn, settings.raw_storage_dir, source.id, page.content, page.content_type,
                                      url=page.url, http_status=page.status)
                    doc = build_document(extracted, external_id=external_id, source_url=page.url,
                                         default_type=source.default_doc_type,
                                         issuing_authority=source.issuing_authority, legal_status=source.legal_status)
                    result = store_document(conn, source.id, doc, raw_id)
                conn.commit()   # one document per commit: a crash mid-crawl keeps finished work
                report.counts[result.status] += 1
            except Exception as exc:
                report.errors.append(f"{url}: store failed: {exc}")
        for link in extracted.links:
            link = link.split("#")[0]
            if link not in seen and (source.should_follow(link) or source.document_id_for(link)):
                seen.add(link)
                queue.append(link)

    conn.execute("UPDATE sources SET last_run_at = now(), last_run_status = %s WHERE id = %s",
                 (report.summary(), source.id))
    return report


def _fetch(fetcher: Fetcher, source: Source, url: str) -> Fetched:
    if source.render == "browser" and not url.lower().endswith(".pdf"):
        if not fetcher.allowed(url):
            raise RobotsDisallowed(url)
        fetcher._throttle(url)
        return render_with_browser(url, fetcher.user_agent)
    return fetcher.get(url)


SUPPORTED_SUFFIXES = {".html", ".htm", ".pdf", ".txt", ".md", ".json"}


def import_files(conn: psycopg.Connection, source: Source, paths: list[Path], settings: Settings,
                 actor: str = "import") -> RunReport:
    """Import local files a reviewer downloaded or received under a data-sharing agreement."""
    if source.access == "not_public" and actor == "import":
        raise SourceNotRunnable(f"{source.id} is not public: pass --authorized-by with the authorizing party")
    report = RunReport(source.id)
    files = []
    for p in paths:
        files += sorted(f for f in p.rglob("*") if f.is_file()) if p.is_dir() else [p]
    for f in files:
        if f.suffix.lower() not in SUPPORTED_SUFFIXES:
            report.counts["skipped_unsupported"] += 1
            continue
        data = f.read_bytes()
        ctype = "application/json" if f.suffix.lower() == ".json" else (mimetypes.guess_type(f.name)[0] or "text/plain")
        try:
            with conn.transaction():
                raw_id = save_raw(conn, settings.raw_storage_dir, source.id, data, ctype, original_name=f.name)
                if ctype == "application/json":
                    docs = parse_json_feed(data, source.default_doc_type)
                else:
                    page = extract(data, ctype, source.selectors)
                    external_id = "file:" + hashlib.sha256(f.name.encode()).hexdigest()[:16]
                    docs = [build_document(page, external_id=external_id, source_url=None,
                                           default_type=source.default_doc_type,
                                           issuing_authority=source.issuing_authority,
                                           legal_status=source.legal_status)]
                for doc in docs:
                    if source.legal_status.value != "unknown":
                        doc.legal_status = source.legal_status
                    report.counts[store_document(conn, source.id, doc, raw_id, actor=actor).status] += 1
            conn.commit()
            report.pages_fetched += 1
        except Exception as exc:
            report.errors.append(f"{f}: {exc}")
    return report
