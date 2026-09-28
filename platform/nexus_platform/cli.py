"""Command line: `python -m nexus_platform.cli <command>` (installed as `nexus`)."""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from .arabic import match_article_header
from .config import get_settings
from .db import connect, migrate
from .ingestion.fetcher import Fetcher, render_with_browser
from .ingestion.parsers import build_document, extract
from .ingestion.pipeline import SourceNotRunnable, crawl_source, import_files
from .ingestion.registry import load_registry
from .ingestion.store import ReviewError, review_version, sync_sources
from .models import DocType, LegalStatus


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="nexus", description="M NEXUS Connect — legal knowledge base")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("migrate", help="create/upgrade the database schema and sync the source registry")
    sub.add_parser("sources", help="list registered sources and how each can be imported")

    c = sub.add_parser("crawl", help="crawl an enabled public source")
    c.add_argument("source")
    c.add_argument("--max-pages", type=int)
    c.add_argument("--force", action="store_true", help="run even if the source is disabled (testing only)")

    i = sub.add_parser("import-files", help="import local HTML/PDF/TXT/JSON files into a source")
    i.add_argument("source")
    i.add_argument("paths", nargs="+", type=Path)
    i.add_argument("--authorized-by", help="required for not_public sources: who authorized the import")

    k = sub.add_parser("calibrate", help="fetch one URL (or file) and show how it would be parsed")
    k.add_argument("target")
    k.add_argument("--source", help="apply this source's selectors")
    k.add_argument("--browser", action="store_true")

    r = sub.add_parser("review", help="approve or reject a pending version")
    r.add_argument("version_id", type=int)
    r.add_argument("decision", choices=["approve", "reject"])
    r.add_argument("--reviewer", required=True)
    r.add_argument("--note")
    r.add_argument("--legal-status", choices=[s.value for s in LegalStatus])

    sub.add_parser("pending", help="list versions waiting for review")

    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = get_settings()
    registry = load_registry(settings.registry_path)

    if args.cmd == "migrate":
        migrate(settings.database_url)
        with connect(settings.database_url) as conn:
            sync_sources(conn, registry)
        print(f"schema ready; {len(registry)} sources registered")
        return 0

    if args.cmd == "sources":
        for s in registry.values():
            state = "enabled" if s.enabled else "disabled"
            cal = "calibrated" if s.calibrated else "NOT calibrated" if s.connector == "crawler" else "-"
            print(f"{s.id:22} {s.access:19} {s.connector:8} {state:9} {cal:15} {s.name_ar}")
        return 0

    if args.cmd == "calibrate":
        return _calibrate(args, settings, registry)

    with connect(settings.database_url) as conn:
        sync_sources(conn, registry)
        if args.cmd in ("crawl", "import-files") and args.source not in registry:
            print(f"unknown source {args.source}; see `nexus sources`", file=sys.stderr)
            return 2
        if args.cmd == "crawl":
            try:
                report = crawl_source(conn, registry[args.source], settings, max_pages=args.max_pages, force=args.force)
            except SourceNotRunnable as exc:
                print(exc, file=sys.stderr)
                return 2
        elif args.cmd == "import-files":
            actor = f"import:authorized-by:{args.authorized_by}" if args.authorized_by else "import"
            try:
                report = import_files(conn, registry[args.source], args.paths, settings, actor=actor)
            except SourceNotRunnable as exc:
                print(exc, file=sys.stderr)
                return 2
        elif args.cmd == "pending":
            rows = conn.execute(
                """SELECT v.id, v.version_no, d.source_id, d.title, v.parse_warnings FROM document_versions v
                   JOIN documents d ON d.id = v.document_id WHERE v.review_status = 'pending' ORDER BY v.created_at"""
            ).fetchall()
            for row in rows:
                warn = f"  ⚠ {', '.join(row['parse_warnings'])}" if row["parse_warnings"] else ""
                print(f"{row['id']:>7}  v{row['version_no']}  [{row['source_id']}] {row['title']}{warn}")
            return 0
        else:  # review
            try:
                with conn.transaction():
                    review_version(conn, args.version_id, args.reviewer, args.decision == "approve", args.note,
                                   LegalStatus(args.legal_status) if args.legal_status else None)
            except ReviewError as exc:
                print(exc, file=sys.stderr)
                return 2
            print(f"version {args.version_id}: {args.decision}d by {args.reviewer}")
            return 0
    print(report.summary())
    for err in report.errors[:50]:
        print("  error:", err)
    return 1 if report.errors and not report.counts else 0


def _calibrate(args, settings, registry) -> int:
    source = registry.get(args.source) if args.source else None
    selectors = source.selectors if source else {}
    target = args.target
    if Path(target).exists():
        data = Path(target).read_bytes()
        ctype = "application/pdf" if target.lower().endswith(".pdf") else "text/html" if target.lower().endswith((".html", ".htm")) else "text/plain"
        url = None
    else:
        fetcher = Fetcher(settings)
        page = render_with_browser(target, fetcher.user_agent) if args.browser else fetcher.get(target)
        data, ctype, url = page.content, page.content_type, page.url
        print(f"HTTP {page.status}  {ctype}  {len(data)} bytes  robots-allowed={fetcher.allowed(target)}")
    page = extract(data, ctype, selectors, base_url=url)
    doc = build_document(page, external_id="calibrate", source_url=url,
                         default_type=source.default_doc_type if source else DocType.OTHER)
    headers = [ln for ln in page.text.splitlines() if match_article_header(ln)]
    print(json.dumps({
        "title": doc.title, "doc_type": doc.doc_type.value, "instrument": doc.instrument,
        "issue_date_hijri": doc.issue_date_hijri, "text_chars": len(page.text),
        "article_headers_found": len(headers), "first_headers": headers[:5],
        "provisions": len(doc.provisions), "warnings": doc.warnings, "links_found": len(page.links),
        "document_links": [l for l in page.links if source and source.document_id_for(l)][:10],
        "follow_links": [l for l in page.links if source and source.should_follow(l)][:10],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
