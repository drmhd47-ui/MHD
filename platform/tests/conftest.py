from __future__ import annotations

import os
import re
import threading
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import psycopg
import pytest

from nexus_platform.config import PLATFORM_ROOT, Settings
from nexus_platform.db import connect, migrate
from nexus_platform.ingestion.registry import Source, load_registry
from nexus_platform.ingestion.store import sync_sources
from nexus_platform.models import DocType

FIXTURES = Path(__file__).parent / "fixtures"
ADMIN_URL = os.environ.get("NEXUS_TEST_ADMIN_URL", "postgresql://postgres@localhost:5432/postgres")
LAW_ID = "11111111-2222-3333-4444-555555555555"
REG_ID = "66666666-7777-8888-9999-000000000000"


@pytest.fixture(scope="session")
def database_url():
    name = f"nexus_test_{uuid.uuid4().hex[:8]}"
    try:
        admin = psycopg.connect(ADMIN_URL, autocommit=True)
    except psycopg.OperationalError as exc:
        pytest.skip(f"PostgreSQL not reachable at NEXUS_TEST_ADMIN_URL: {exc}")
    admin.execute(f'CREATE DATABASE "{name}"')
    base, _, query = ADMIN_URL.partition("?")
    url = base.rsplit("/", 1)[0] + f"/{name}" + (f"?{query}" if query else "")
    migrate(url)
    migrate(url)  # idempotent
    yield url
    admin.execute(f'DROP DATABASE "{name}" WITH (FORCE)')
    admin.close()


@pytest.fixture
def settings(database_url, tmp_path):
    return Settings(database_url=database_url, raw_storage_dir=tmp_path / "raw",
                    registry_path=PLATFORM_ROOT / "sources" / "registry.yaml",
                    request_delay_seconds=0, reviewer_tokens="reviewer-a:" + "t" * 32)


@pytest.fixture
def conn(settings):
    c = connect(settings.database_url)
    with c.transaction():
        c.execute("TRUNCATE provisions, document_versions, documents, raw_documents, assistant_log RESTART IDENTITY CASCADE")
        c.execute("UPDATE documents SET current_version_id = NULL")
    sync_sources(c, load_registry(settings.registry_path))
    c.commit()
    yield c
    c.rollback()
    c.close()


class _State:
    law_version = "law_v1.html"
    hits: list[str] = []


def _handler(state: _State):
    routes = {
        "/robots.txt": ("robots.txt", "text/plain"),
        "/BoeLaws/Laws/Folders": ("index.html", "text/html; charset=utf-8"),
        "/BoeLaws/Laws/Folders/2": ("folder2.html", "text/html; charset=utf-8"),
        f"/BoeLaws/Laws/LawDetails/{REG_ID}/1": ("reg.html", "text/html; charset=utf-8"),
    }

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802
            state.hits.append(self.path)
            if self.path == f"/BoeLaws/Laws/LawDetails/{LAW_ID}/1":
                name, ctype = state.law_version, "text/html; charset=utf-8"
            elif self.path in routes:
                name, ctype = routes[self.path]
            else:
                self.send_response(404)
                self.end_headers()
                return
            body = (FIXTURES / "boe" / name).read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    return Handler


@pytest.fixture
def boe_server():
    state = _State()
    state.hits = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), _handler(state))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    source = Source(
        id="boe", name_ar="test", owner_ar="test", access="public_web", connector="crawler",
        default_doc_type=DocType.LAW, base_url=base, seeds=[base + "/BoeLaws/Laws/Folders"],
        follow_patterns=[re.compile("^" + re.escape(base) + r"/(BoeLaws/Laws/Folders.*|private/.*)$")],
        document_patterns=[re.compile("^" + re.escape(base) + r"/BoeLaws/Laws/LawDetails/(?P<id>[0-9a-f-]{36})/1$")],
        selectors={"title": [], "body": [".law-body"]}, enabled=True,
    )
    yield state, source
    server.shutdown()
