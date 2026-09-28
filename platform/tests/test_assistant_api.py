import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from nexus_platform.api.app import create_app
from nexus_platform.assistant.providers import ClaudeProvider, Draft, ExtractiveProvider
from nexus_platform.assistant.service import ask
from nexus_platform.ingestion.pipeline import crawl_source

from .test_pipeline import _approve_all

TOKEN = "t" * 32


@pytest.fixture
def loaded(conn, settings, boe_server):
    _, source = boe_server
    crawl_source(conn, source, settings)
    _approve_all(conn)
    conn.commit()
    return conn


class ScriptedProvider:
    name = "claude"

    def __init__(self, answer, cite_first=True, raises=None):
        self._answer, self._cite_first, self._raises = answer, cite_first, raises
        self.seen_question = None

    def answer(self, question, category, hits):
        self.seen_question = question
        if self._raises:
            raise self._raises
        return Draft(answer=self._answer, cited_ids=[hits[0].provision_id] if self._cite_first else [],
                     provider="claude:test", needs_lawyer=False)


def test_extractive_answer_cites_approved_text(loaded, settings):
    a = ask(loaded, "كم مدة الإشعار عند إنهاء عقد العمل غير محدد المدة؟", settings)
    assert a.provider == "extractive" and a.category == "labor"
    assert a.citations[0].label == "المادة الثالثة" and "ستين" in a.answer
    assert a.citation_check_passed and a.disclaimer


def test_not_found_never_guesses(loaded, settings):
    a = ask(loaded, "ما عقوبة تهريب الآثار في البحر؟", settings)
    assert a.citations == [] and a.offer_lawyer and "لم أجد" in a.answer


def test_invented_article_is_removed(loaded, settings):
    provider = ScriptedProvider("ينص النظام على إشعار مدته ستون يوماً وفق المادة الثالثة. "
                                "وتمنح المادة (48) العامل تعويضاً مضاعفاً.")
    a = ask(loaded, "كم مدة الإشعار لإنهاء عقد العمل؟", settings, provider=provider)
    assert "48" not in a.answer and "المادة الثالثة" in a.answer
    assert not a.citation_check_passed
    log = loaded.execute("SELECT citation_check_passed, removed_citations FROM assistant_log ORDER BY id DESC LIMIT 1").fetchone()
    assert log["citation_check_passed"] is False and "(48)" in log["removed_citations"][0]


def test_everything_unverifiable_falls_back_to_texts(loaded, settings):
    a = ask(loaded, "إشعار إنهاء عقد العمل", settings, provider=ScriptedProvider("حسب المادة (300) قضيتك رابحة."))
    assert a.answer.startswith("تعذّر") and "«" in a.answer


def test_provider_failure_degrades_to_extractive(loaded, settings):
    a = ask(loaded, "إشعار إنهاء عقد العمل", settings, provider=ScriptedProvider("", raises=RuntimeError("down")))
    assert a.provider == "extractive" and "provider_fallback:RuntimeError" in a.notes


def test_only_redacted_question_reaches_provider_and_log(loaded, settings):
    provider = ScriptedProvider("ينص النظام على الإشعار.")
    ask(loaded, "أنا صاحب الهوية 1098765432 وجوالي 0559876543، كم مدة إشعار إنهاء عقد العمل؟", settings, provider=provider)
    assert "1098765432" not in provider.seen_question and "0559876543" not in provider.seen_question
    q = loaded.execute("SELECT question_redacted FROM assistant_log ORDER BY id DESC LIMIT 1").fetchone()["question_redacted"]
    assert "1098765432" not in q and "[رقم هوية]" in q


def test_sensitive_and_urgent_questions(loaded, settings):
    settings.llm_provider = "claude"
    a = ask(loaded, "أخوي موقوف عند النيابة من أمس وش أسوي", settings)
    assert a.provider in ("extractive", "none")          # criminal stays on the server
    assert a.offer_lawyer and "detention" in a.risk_flags and a.urgent_notice


def test_claude_provider_request_and_parsing():
    calls = {}

    class FakeMessages:
        def create(self, **kwargs):
            calls.update(kwargs)
            body = {"answer": "ينص النظام على الإشعار.", "cited_provision_ids": [7, 999],
                    "needs_lawyer": True, "suggested_specialty": "labor"}
            return SimpleNamespace(stop_reason="end_turn", model="claude-opus-5-5",
                                   content=[SimpleNamespace(type="thinking"), SimpleNamespace(type="text", text=json.dumps(body))])

    client = SimpleNamespace(beta=SimpleNamespace(messages=FakeMessages()))
    hit = SimpleNamespace(provision_id=7, doc_title="نظام", label="المادة الثالثة", legal_status="in_force", text="نص")
    draft = ClaudeProvider("claude-opus-5-5", "medium", client=client).answer("سؤال", "labor", [hit])
    assert draft.cited_ids == [7] and "dropped_unknown_provision_ids" in draft.notes and draft.needs_lawyer
    assert calls["model"] == "claude-opus-5-5" and calls["fallbacks"] == "default"
    assert calls["betas"] == ["server-side-fallback-2026-07-01"]
    assert calls["thinking"] == {"type": "adaptive"}
    assert calls["output_config"]["format"]["type"] == "json_schema"
    assert "<provision id=\"7\"" in calls["messages"][0]["content"]


def test_api_end_to_end(loaded, settings):
    client = TestClient(create_app(settings))
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/").status_code == 200
    stats = client.get("/api/stats").json()
    assert stats["approved_documents"] == 2 and stats["pending_versions"] == 0

    hits = client.get("/api/search", params={"q": "مكافأة نهاية الخدمة"}).json()
    assert hits[0]["label"] == "المادة الخامسة"
    doc = client.get(f"/api/documents/{hits[0]['document_id']}").json()
    assert doc["versions"][0]["review_status"] == "approved" and len(doc["provisions"]) == 6

    r = client.post("/api/assistant/ask", json={"question": "مكافأة نهاية الخدمة كم؟"})
    assert r.status_code == 200, r.text
    a = r.json()
    assert a["citations"] and a["disclaimer"]

    assert client.get("/api/review/queue").status_code == 401
    assert client.get("/api/review/queue", headers={"Authorization": "Bearer wrong"}).status_code == 401
    ok = {"Authorization": f"Bearer {TOKEN}"}
    assert client.get("/api/review/queue", headers=ok).json() == []
    assert client.post("/api/review/versions/999999", headers=ok, json={"approve": True}).status_code == 409
    sources = client.get("/api/sources").json()
    assert {s["id"] for s in sources} >= {"boe", "uqn", "ncar", "moj_judicial", "majalla", "internal_regulations"}
    headers = client.get("/").headers
    assert headers["x-frame-options"] == "DENY" and "default-src 'self'" in headers["content-security-policy"]


def test_extractive_provider_quotes_verbatim():
    hit = SimpleNamespace(provision_id=1, label="المادة الأولى", doc_title="نظام", text="نص   حرفي\nكامل")
    d = ExtractiveProvider().answer("س", "general", [hit])
    assert "«نص حرفي كامل»" in d.answer and d.cited_ids == [1]
