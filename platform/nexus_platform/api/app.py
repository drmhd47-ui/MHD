from __future__ import annotations

import hmac
from dataclasses import asdict
from pathlib import Path
from typing import Iterator

import psycopg
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from ..assistant.service import ask
from ..config import Settings, get_settings
from ..db import connect
from ..ingestion.registry import load_registry
from ..ingestion.store import ReviewError, review_version
from ..models import LegalStatus
from ..retrieval import search

STATIC = Path(__file__).parent / "static"


class AskBody(BaseModel):
    question: str = Field(min_length=3, max_length=4000)
    consent_for_review: bool = False


class ReviewBody(BaseModel):
    approve: bool
    note: str | None = Field(default=None, max_length=2000)
    legal_status: LegalStatus | None = None


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="M NEXUS Connect — Legal Knowledge API", version="1.0.0")

    def db() -> Iterator[psycopg.Connection]:
        conn = connect(settings.database_url)
        try:
            with conn.transaction():
                yield conn
        finally:
            conn.close()

    def reviewer(authorization: str = Header(default="")) -> str:
        token = authorization.removeprefix("Bearer ").strip()
        for known, name in settings.reviewers.items():
            if token and hmac.compare_digest(token, known):
                return name
        raise HTTPException(401, "reviewer token required")

    @app.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:")
        return response

    @app.get("/api/health")
    def health(conn: psycopg.Connection = Depends(db)):
        conn.execute("SELECT 1")
        return {"status": "ok", "llm_provider": settings.llm_provider}

    @app.get("/api/stats")
    def stats(conn: psycopg.Connection = Depends(db)):
        row = conn.execute(
            """SELECT
                 (SELECT count(*) FROM documents WHERE current_version_id IS NOT NULL) AS approved_documents,
                 (SELECT count(*) FROM provisions p JOIN documents d ON d.current_version_id = p.version_id) AS approved_provisions,
                 (SELECT count(*) FROM document_versions WHERE review_status = 'pending') AS pending_versions"""
        ).fetchone()
        return row

    @app.get("/api/sources")
    def sources(conn: psycopg.Connection = Depends(db)):
        registry = load_registry(settings.registry_path)
        runs = {r["id"]: r for r in conn.execute("SELECT id, last_run_at::text, last_run_status FROM sources").fetchall()}
        return [
            {"id": s.id, "name_ar": s.name_ar, "owner_ar": s.owner_ar, "access": s.access, "connector": s.connector,
             "base_url": s.base_url, "enabled": s.enabled, "calibrated": s.calibrated, "notes": s.notes,
             "last_run_at": runs.get(s.id, {}).get("last_run_at"), "last_run_status": runs.get(s.id, {}).get("last_run_status")}
            for s in registry.values()
        ]

    @app.get("/api/search")
    def search_api(q: str = Query(min_length=2, max_length=500), limit: int = Query(10, ge=1, le=50),
                   include_historical: bool = False, conn: psycopg.Connection = Depends(db)):
        return [h.as_dict() for h in search(conn, q, limit=limit, include_historical=include_historical)]

    @app.get("/api/documents/{document_id}")
    def document(document_id: str, conn: psycopg.Connection = Depends(db)):
        doc = conn.execute(
            """SELECT d.id::text, d.title, d.doc_type, d.legal_status, d.instrument, d.issue_date_hijri, d.source_url,
                      d.source_id, v.version_no, v.reviewed_at::text, v.reviewed_by
               FROM documents d JOIN document_versions v ON v.id = d.current_version_id WHERE d.id::text = %s""",
            (document_id,),
        ).fetchone()
        if not doc:
            raise HTTPException(404, "document not found or not yet approved")
        doc["provisions"] = conn.execute(
            """SELECT p.id, p.label, p.article_number, p.is_repeat, p.text_original AS text
               FROM provisions p JOIN documents d ON d.current_version_id = p.version_id
               WHERE d.id::text = %s ORDER BY p.seq""", (document_id,),
        ).fetchall()
        doc["versions"] = conn.execute(
            """SELECT version_no, review_status, created_at::text, reviewed_at::text
               FROM document_versions WHERE document_id::text = %s ORDER BY version_no""", (document_id,),
        ).fetchall()
        return doc

    @app.post("/api/assistant/ask")
    def assistant(body: AskBody, conn: psycopg.Connection = Depends(db)):
        return asdict(ask(conn, body.question, settings, consent_for_review=body.consent_for_review))

    # --- Review workflow (reviewers only) -------------------------------------------------

    @app.get("/api/review/queue")
    def queue(limit: int = Query(50, le=200), who: str = Depends(reviewer), conn: psycopg.Connection = Depends(db)):
        return conn.execute(
            """SELECT v.id AS version_id, v.version_no, v.created_at::text, v.parse_warnings, d.id::text AS document_id,
                      d.title, d.doc_type, d.source_id, d.source_url,
                      (SELECT count(*) FROM provisions p WHERE p.version_id = v.id) AS provision_count
               FROM document_versions v JOIN documents d ON d.id = v.document_id
               WHERE v.review_status = 'pending' ORDER BY v.created_at LIMIT %s""", (limit,),
        ).fetchall()

    @app.get("/api/review/versions/{version_id}")
    def version_detail(version_id: int, who: str = Depends(reviewer), conn: psycopg.Connection = Depends(db)):
        v = conn.execute(
            """SELECT v.id AS version_id, v.version_no, v.review_status, v.parse_warnings, v.full_text,
                      d.id::text AS document_id, d.title, d.doc_type, d.instrument, d.source_url, d.legal_status,
                      d.current_version_id
               FROM document_versions v JOIN documents d ON d.id = v.document_id WHERE v.id = %s""", (version_id,),
        ).fetchone()
        if not v:
            raise HTTPException(404, "version not found")
        v["provisions"] = conn.execute(
            "SELECT seq, label, article_number, is_repeat, text_original AS text FROM provisions WHERE version_id = %s ORDER BY seq",
            (version_id,),
        ).fetchall()
        v["previous_provisions"] = conn.execute(
            "SELECT seq, label, article_number, text_original AS text FROM provisions WHERE version_id = %s ORDER BY seq",
            (v["current_version_id"],),
        ).fetchall() if v["current_version_id"] and v["current_version_id"] != version_id else []
        return v

    @app.post("/api/review/versions/{version_id}")
    def review(version_id: int, body: ReviewBody, who: str = Depends(reviewer), conn: psycopg.Connection = Depends(db)):
        try:
            review_version(conn, version_id, who, body.approve, body.note, body.legal_status)
        except ReviewError as exc:
            raise HTTPException(409, str(exc)) from exc
        return {"status": "approved" if body.approve else "rejected", "reviewer": who}

    app.mount("/static", StaticFiles(directory=STATIC), name="static")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(STATIC / "index.html")

    return app
