from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .config import PLATFORM_ROOT, get_settings


def connect(url: str | None = None) -> psycopg.Connection:
    return psycopg.connect(url or get_settings().database_url, row_factory=dict_row)


@contextmanager
def transaction(url: str | None = None) -> Iterator[psycopg.Connection]:
    conn = connect(url)
    try:
        with conn.transaction():
            yield conn
    finally:
        conn.close()


def migrate(url: str | None = None) -> None:
    sql_dir = PLATFORM_ROOT / "sql"
    with transaction(url) as conn:
        for path in sorted(sql_dir.glob("*.sql")):
            conn.execute(path.read_text(encoding="utf-8"))


def audit(conn: psycopg.Connection, actor: str, action: str, entity: str, entity_id: str, detail: dict | None = None) -> None:
    conn.execute(
        "INSERT INTO audit_log (actor, action, entity, entity_id, detail) VALUES (%s, %s, %s, %s, %s)",
        (actor, action, entity, entity_id, psycopg.types.json.Jsonb(detail or {})),
    )
