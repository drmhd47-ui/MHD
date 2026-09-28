import pytest

from nexus_platform.ingestion.pipeline import SourceNotRunnable, crawl_source, import_files
from nexus_platform.ingestion.registry import load_registry
from nexus_platform.ingestion.store import ReviewError, review_version
from nexus_platform.models import LegalStatus
from nexus_platform.retrieval import search

from .conftest import FIXTURES, LAW_ID


def _approve_all(conn, reviewer="reviewer-a", legal_status=LegalStatus.IN_FORCE):
    for row in conn.execute("SELECT id FROM document_versions WHERE review_status = 'pending' ORDER BY id").fetchall():
        review_version(conn, row["id"], reviewer, True, legal_status=legal_status)


def test_crawl_obeys_patterns_and_robots(conn, settings, boe_server):
    state, source = boe_server
    report = crawl_source(conn, source, settings)
    assert report.errors == []
    assert report.counts["new"] == 2
    assert report.counts["robots_disallowed"] == 1           # /private/ is disallowed by robots.txt
    assert not any(h.startswith("/private") for h in state.hits)
    assert not any("example.org" in h for h in state.hits)   # never leaves the source's patterns

    law = conn.execute("SELECT * FROM documents WHERE external_id = %s", (LAW_ID,)).fetchone()
    assert law["title"] == "نظام اختباري للعمل"
    assert law["instrument"].startswith("المرسوم الملكي رقم (م/99)")
    assert law["issue_date_hijri"] == "1445/1/1"
    assert law["current_version_id"] is None                 # nothing is public before review
    labels = [r["label"] for r in conn.execute(
        "SELECT label FROM provisions p JOIN documents d ON d.id = p.document_id WHERE d.external_id = %s ORDER BY seq",
        (LAW_ID,)).fetchall()]
    assert labels == ["الديباجة", "المادة الأولى", "المادة الثانية", "المادة الثالثة", "المادة الرابعة", "المادة الخامسة"]
    assert all("ليست نصاً" not in l for l in labels)          # <script> content is ignored

    reg_warnings = conn.execute("SELECT parse_warnings FROM document_versions v JOIN documents d ON d.id = v.document_id "
                                "WHERE d.title LIKE 'اللائحة%%'").fetchone()["parse_warnings"]
    assert reg_warnings == ["numbering_gap_2_to_4"]


def test_review_gates_search_and_versions(conn, settings, boe_server):
    state, source = boe_server
    crawl_source(conn, source, settings)
    assert search(conn, "إشعار إنهاء عقد العمل") == []        # pending text is not searchable

    _approve_all(conn)
    hits = search(conn, "إشعار إنهاء عقد العمل غير محدد المدة")
    assert hits and hits[0].label == "المادة الثالثة" and "ستين" in hits[0].text

    # explicit article lookup
    hits = search(conn, "المادة الخامسة من نظام اختباري للعمل")
    assert hits[0].label == "المادة الخامسة"
    assert search(conn, "المادة (2) اللائحة الاختبارية")[0].text.startswith("يعد صاحب العمل")

    # unchanged re-crawl creates nothing
    assert crawl_source(conn, source, settings).counts["unchanged"] == 2

    # an amendment creates a pending version; the approved one stays current until review
    state.law_version = "law_v2.html"
    report = crawl_source(conn, source, settings)
    assert report.counts["updated"] == 1
    assert "ستين" in search(conn, "إشعار إنهاء عقد العمل غير محدد المدة")[0].text
    pending = conn.execute("SELECT id, version_no FROM document_versions WHERE review_status = 'pending'").fetchall()
    assert [p["version_no"] for p in pending] == [2]
    review_version(conn, pending[0]["id"], "reviewer-a", True)
    hits = search(conn, "إشعار إنهاء عقد العمل غير محدد المدة")
    assert "تسعين" in hits[0].text
    repeat = conn.execute("SELECT article_number, is_repeat FROM provisions WHERE label = 'المادة الرابعة مكرر'").fetchone()
    assert repeat == {"article_number": 4, "is_repeat": True}
    versions = conn.execute("SELECT count(*) AS n FROM document_versions v JOIN documents d ON d.id = v.document_id "
                            "WHERE d.external_id = %s", (LAW_ID,)).fetchone()["n"]
    assert versions == 2                                     # history is kept

    with pytest.raises(ReviewError):
        review_version(conn, pending[0]["id"], "reviewer-a", True)   # already reviewed
    audit = conn.execute("SELECT action FROM audit_log ORDER BY id").fetchall()
    assert {"version_new", "version_updated", "version_approved"} <= {a["action"] for a in audit}


def test_disabled_and_file_only_sources_refuse_crawling(conn, settings, boe_server):
    _, source = boe_server
    source.enabled = False
    with pytest.raises(SourceNotRunnable):
        crawl_source(conn, source, settings)
    registry = load_registry(settings.registry_path)
    with pytest.raises(SourceNotRunnable):
        crawl_source(conn, registry["moj_principles"], settings)


def test_import_files_feed_decision_and_historical(conn, settings):
    registry = load_registry(settings.registry_path)
    r = import_files(conn, registry["manual"], [FIXTURES / "files" / "feed.json"], settings)
    assert r.counts["new"] == 1 and not r.errors
    r = import_files(conn, registry["moj_principles"], [FIXTURES / "files" / "decision.txt"], settings)
    assert r.counts["new"] == 1
    r = import_files(conn, registry["majalla"], [FIXTURES / "files" / "majalla_sample.txt"], settings)
    assert r.counts["new"] == 1

    decision = conn.execute("SELECT d.doc_type, v.full_text, v.parse_warnings FROM documents d "
                            "JOIN document_versions v ON v.document_id = d.id WHERE d.source_id = 'moj_principles'").fetchone()
    assert decision["doc_type"] == "judicial_principle"
    assert "1012345678" not in decision["full_text"] and "0551234567" not in decision["full_text"]
    assert "judicial_text_manual_name_check_required" in decision["parse_warnings"]

    majalla_version = conn.execute("SELECT v.id FROM document_versions v JOIN documents d ON d.id = v.document_id "
                                   "WHERE d.source_id = 'majalla'").fetchone()["id"]
    with pytest.raises(ReviewError, match="cannot be marked as law in force"):
        review_version(conn, majalla_version, "reviewer-a", True, legal_status=LegalStatus.IN_FORCE)
    _approve_all(conn, legal_status=None)
    assert search(conn, "قاضي التنفيذ السند التنفيذي")[0].doc_title == "نظام اختباري للتنفيذ"
    # historical references are excluded unless asked for, and keep their status after review
    assert not any(h.doc_title.startswith("مقتطف") for h in search(conn, "مرجع فقهي تاريخي العقد"))
    majalla = search(conn, "مرجع فقهي تاريخي العقد", include_historical=True)
    assert majalla and majalla[0].legal_status == "historical"


def test_not_public_requires_authorization(conn, settings):
    registry = load_registry(settings.registry_path)
    with pytest.raises(SourceNotRunnable):
        import_files(conn, registry["internal_regulations"], [FIXTURES / "files" / "decision.txt"], settings)
    r = import_files(conn, registry["internal_regulations"], [FIXTURES / "files" / "decision.txt"], settings,
                     actor="import:authorized-by:جهة-اختبار")
    assert r.counts["new"] == 1


def test_audit_log_is_append_only(conn):
    conn.execute("INSERT INTO audit_log (actor, action, entity, entity_id) VALUES ('t', 'x', 'y', '1')")
    with pytest.raises(Exception, match="append-only"):
        conn.execute("DELETE FROM audit_log")
