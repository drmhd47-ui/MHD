"""Search over APPROVED provisions: explicit article lookup + Arabic full-text + title similarity."""
from __future__ import annotations

import re
from dataclasses import dataclass

import psycopg

from .arabic import normalize, parse_ordinal

STOPWORDS = {normalize(w) for w in (
    "في من على إلى الى عن ما ماذا هل كيف لماذا متى أين اين هو هي هم انا أنا انت أنت نحن هذا هذه ذلك تلك "
    "التي الذي الذين او أو و ثم لا لم لن قد كان كانت يكون مع عند بعد قبل كل أي اي اذا إذا ان أن إن "
    "لي لك له لها لنا بدون غير حتى يا وش ايش شو ابي أبي ابغى أبغى ودي عندي"
).split()}

_ARTICLE_REF = re.compile(
    r"(?:ال)?ماده\s*(?:رقم\s*)?\(?\s*(?P<num>\d+)\s*\)?|(?:ال)?ماده\s+(?P<words>(?:ال\S+\s*){1,5})"
)
_TOKEN = re.compile(r"[ء-ي0-9A-Za-z]{2,}")


@dataclass
class Hit:
    provision_id: int
    document_id: str
    version_id: int
    doc_title: str
    doc_type: str
    legal_status: str
    instrument: str | None
    source_url: str | None
    label: str
    article_number: int | None
    text: str
    score: float
    reviewed_at: str | None

    def as_dict(self) -> dict:
        return {k: (str(v) if k == "reviewed_at" and v else v) for k, v in self.__dict__.items()}


_SELECT = """
SELECT p.id AS provision_id, d.id::text AS document_id, p.version_id, d.title AS doc_title, d.doc_type,
       d.legal_status, d.instrument, d.source_url, p.label, p.article_number, p.text_original AS text,
       v.reviewed_at::text AS reviewed_at, {score} AS score
FROM provisions p
JOIN documents d ON d.current_version_id = p.version_id
JOIN document_versions v ON v.id = p.version_id AND v.review_status = 'approved'
"""


def _terms(q_norm: str) -> list[str]:
    return [t for t in _TOKEN.findall(q_norm) if t not in STOPWORDS][:24]


def find_article(conn: psycopg.Connection, query: str) -> list[Hit]:
    """Handle "المادة (77) من نظام العمل" / "المادة السابعة والسبعون نظام العمل"."""
    q = normalize(query)
    m = _ARTICLE_REF.search(q)
    if not m:
        return []
    number = int(m.group("num")) if m.group("num") else parse_ordinal(m.group("words") or "")
    if not number:
        return []
    rest = (q[:m.start()] + " " + q[m.end():]).strip()
    rest = re.sub(r"^\s*من\s+", "", rest)
    if len(rest) < 3:
        return []
    rows = conn.execute(
        _SELECT.format(score="similarity(d.title_normalized, %(rest)s) + 1.0")
        + " WHERE p.article_number = %(n)s AND similarity(d.title_normalized, %(rest)s) > 0.2"
          " ORDER BY score DESC, p.is_repeat, p.seq LIMIT 3",
        {"rest": rest, "n": number},
    ).fetchall()
    return [Hit(**r) for r in rows]


def search(conn: psycopg.Connection, query: str, limit: int = 8, doc_types: list[str] | None = None,
           include_historical: bool = False) -> list[Hit]:
    q_norm = normalize(query)
    terms = _terms(q_norm)
    hits = find_article(conn, query)
    if not terms:
        return hits[:limit]
    tsquery = " | ".join(terms)
    filters = ["p.tsv @@ q"]
    params: dict = {"tsq": tsquery, "qn": q_norm, "limit": limit * 3}
    if doc_types:
        filters.append("d.doc_type = ANY(%(types)s)")
        params["types"] = doc_types
    if not include_historical:
        filters.append("d.legal_status <> 'historical'")
    sql = (
        _SELECT.format(score="ts_rank_cd(p.tsv, q, 32) + 0.5 * similarity(d.title_normalized, %(qn)s)"
                             " - CASE WHEN d.legal_status = 'repealed' THEN 0.5 ELSE 0 END")
        + ", to_tsquery('arabic', %(tsq)s) q WHERE " + " AND ".join(filters)
        + " ORDER BY score DESC LIMIT %(limit)s"
    )
    rows = conn.execute(sql, params).fetchall()
    seen = {h.provision_id for h in hits}
    for r in rows:
        if r["provision_id"] not in seen:
            hits.append(Hit(**r))
            seen.add(r["provision_id"])
    return hits[:limit]
