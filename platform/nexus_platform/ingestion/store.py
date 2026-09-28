"""Persistence for raw files, documents, versions and provisions (with review workflow)."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

import psycopg

from ..arabic import normalize
from ..db import audit
from ..models import LegalStatus, ParsedDocument
from .registry import Source


def sync_sources(conn: psycopg.Connection, sources: dict[str, Source]) -> None:
    for s in sources.values():
        conn.execute(
            """INSERT INTO sources (id, name_ar, owner_ar, access, connector, base_url, enabled, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, now())
               ON CONFLICT (id) DO UPDATE SET name_ar = EXCLUDED.name_ar, owner_ar = EXCLUDED.owner_ar,
                 access = EXCLUDED.access, connector = EXCLUDED.connector, base_url = EXCLUDED.base_url,
                 enabled = EXCLUDED.enabled, updated_at = now()""",
            (s.id, s.name_ar, s.owner_ar, s.access, s.connector, s.base_url, s.enabled),
        )


def save_raw(conn: psycopg.Connection, storage_dir: Path, source_id: str, content: bytes, content_type: str,
             url: str | None = None, original_name: str | None = None, http_status: int | None = None) -> int:
    digest = hashlib.sha256(content).hexdigest()
    path = storage_dir / source_id / digest[:2] / digest
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(content)
        tmp.replace(path)
    row = conn.execute(
        """INSERT INTO raw_documents (source_id, url, original_name, sha256, content_type, storage_path, http_status)
           VALUES (%s, %s, %s, %s, %s, %s, %s)
           ON CONFLICT (source_id, sha256) DO UPDATE SET fetched_at = now()
           RETURNING id""",
        (source_id, url, original_name, digest, content_type, str(path), http_status),
    ).fetchone()
    return row["id"]


def content_hash(doc: ParsedDocument) -> str:
    h = hashlib.sha256()
    h.update(normalize(doc.title).encode())
    for p in doc.provisions:
        h.update(b"\x1f" + normalize(p.label).encode() + b"\x1e" + normalize(p.text).encode())
    return h.hexdigest()


@dataclass
class StoreResult:
    status: str               # new | updated | unchanged
    document_id: str
    version_id: int | None


def store_document(conn: psycopg.Connection, source_id: str, doc: ParsedDocument, raw_id: int | None,
                   actor: str = "ingestion") -> StoreResult:
    digest = content_hash(doc)
    existing = conn.execute(
        "SELECT id FROM documents WHERE source_id = %s AND external_id = %s FOR UPDATE",
        (source_id, doc.external_id),
    ).fetchone()

    if existing:
        doc_id = existing["id"]
        latest = conn.execute(
            "SELECT id, version_no, content_sha256 FROM document_versions WHERE document_id = %s "
            "ORDER BY version_no DESC LIMIT 1", (doc_id,),
        ).fetchone()
        if latest and latest["content_sha256"] == digest:
            return StoreResult("unchanged", str(doc_id), latest["id"])
        version_no = (latest["version_no"] + 1) if latest else 1
        # Metadata may be refreshed; legal_status is only ever set by a reviewer on approval.
        conn.execute(
            """UPDATE documents SET title = %s, title_normalized = %s, doc_type = %s,
                 issuing_authority = COALESCE(%s, issuing_authority), instrument = COALESCE(%s, instrument),
                 issue_date_hijri = COALESCE(%s, issue_date_hijri), source_url = COALESCE(%s, source_url),
                 updated_at = now() WHERE id = %s""",
            (doc.title, normalize(doc.title), doc.doc_type.value, doc.issuing_authority, doc.instrument,
             doc.issue_date_hijri, doc.source_url, doc_id),
        )
        status = "updated"
    else:
        doc_id = conn.execute(
            """INSERT INTO documents (source_id, external_id, doc_type, title, title_normalized, issuing_authority,
                 instrument, issue_date_hijri, legal_status, branches, source_url)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (source_id, doc.external_id, doc.doc_type.value, doc.title, normalize(doc.title),
             doc.issuing_authority, doc.instrument, doc.issue_date_hijri, doc.legal_status.value,
             doc.branches, doc.source_url),
        ).fetchone()["id"]
        version_no, status = 1, "new"

    version_id = conn.execute(
        """INSERT INTO document_versions (document_id, version_no, content_sha256, raw_document_id, full_text, parse_warnings)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
        (doc_id, version_no, digest, raw_id, doc.full_text, doc.warnings),
    ).fetchone()["id"]
    with conn.cursor() as cur:
        cur.executemany(
            """INSERT INTO provisions (version_id, document_id, seq, article_number, is_repeat, label,
                 text_original, text_normalized) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            [(version_id, doc_id, p.seq, p.article_number, p.is_repeat, p.label, p.text, normalize(p.text))
             for p in doc.provisions],
        )
    audit(conn, actor, f"version_{status}", "document_version", str(version_id),
          {"document_id": str(doc_id), "version_no": version_no, "warnings": doc.warnings})
    return StoreResult(status, str(doc_id), version_id)


class ReviewError(Exception):
    pass


def review_version(conn: psycopg.Connection, version_id: int, reviewer: str, approve: bool,
                   note: str | None = None, legal_status: LegalStatus | None = None) -> None:
    row = conn.execute(
        """SELECT v.id, v.document_id, v.version_no, v.review_status, d.doc_type FROM document_versions v
           JOIN documents d ON d.id = v.document_id WHERE v.id = %s FOR UPDATE OF v""",
        (version_id,),
    ).fetchone()
    if not row:
        raise ReviewError("version not found")
    if row["review_status"] != "pending":
        raise ReviewError(f"version already {row['review_status']}")
    if not approve and not (note and note.strip()):
        raise ReviewError("a rejection requires a note")
    if row["doc_type"] == "fiqh_reference" and legal_status not in (None, LegalStatus.HISTORICAL):
        raise ReviewError("a fiqh/historical reference cannot be marked as law in force")
    conn.execute(
        "UPDATE document_versions SET review_status = %s, reviewed_by = %s, reviewed_at = now(), review_note = %s WHERE id = %s",
        ("approved" if approve else "rejected", reviewer, note, version_id),
    )
    if approve:
        # Only move forward: approving an older pending version never replaces a newer approved one.
        conn.execute(
            """UPDATE documents d SET current_version_id = %s, updated_at = now(),
                 legal_status = COALESCE(%s, d.legal_status)
               WHERE d.id = %s AND (d.current_version_id IS NULL OR
                 (SELECT version_no FROM document_versions WHERE id = d.current_version_id) < %s)""",
            (version_id, legal_status.value if legal_status else None, row["document_id"], row["version_no"]),
        )
    audit(conn, reviewer, "version_approved" if approve else "version_rejected", "document_version",
          str(version_id), {"note": note, "legal_status": legal_status.value if legal_status else None})
