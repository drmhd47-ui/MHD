"""Assistant orchestration: triage → redact → retrieve → generate → verify → log."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

import psycopg

from ..config import Settings
from ..redaction import redact
from ..retrieval import Hit, search
from .citations import verify
from .providers import ClaudeProvider, Draft, ExtractiveProvider, Provider
from .triage import URGENT_MESSAGES, triage

log = logging.getLogger(__name__)

DISCLAIMER = ("هذه معلومات عامة مستخرجة من النصوص النظامية المعتمدة في قاعدة المعرفة، وليست استشارة قانونية. "
              "لتقييم حالتك تحديداً تحدّث مع محامٍ مرخّص.")
NOT_FOUND = ("لم أجد نصاً نظامياً معتمداً في قاعدة المعرفة يغطي سؤالك. لا أستطيع الإجابة من خارج النصوص الموثّقة، "
             "وأنصحك بالتحدث مع محامٍ مختص.")
ALL_REMOVED = ("تعذّر عليّ صياغة إجابة يمكن التحقق من كل مراجعها، فعرضتُ لك النصوص ذات الصلة كما هي. "
               "لتفسيرها في حالتك تحدّث مع محامٍ مختص.")

SENSITIVE_CATEGORIES = {"criminal", "personal_status"}


@dataclass
class Citation:
    provision_id: int
    label: str
    document_title: str
    legal_status: str
    source_url: str | None
    excerpt: str
    reviewed_at: str | None


@dataclass
class AssistantAnswer:
    answer: str
    disclaimer: str
    category: str
    risk_flags: list[str]
    urgent_notice: str | None
    offer_lawyer: bool
    suggested_specialty: str | None
    citations: list[Citation]
    provider: str
    citation_check_passed: bool
    notes: list[str] = field(default_factory=list)


def _choose_provider(settings: Settings, category: str) -> Provider:
    if settings.llm_provider == "claude" and category not in settings.local_only:
        return ClaudeProvider(settings.claude_model, settings.claude_effort)
    return ExtractiveProvider()


def ask(conn: psycopg.Connection, question: str, settings: Settings, consent_for_review: bool = False,
        provider: Provider | None = None) -> AssistantAnswer:
    question = question.strip()[:4000]
    t = triage(question)
    red = redact(question)
    hits: list[Hit] = search(conn, red.text, limit=settings.retrieval_top_k)
    notes: list[str] = []
    urgent_notice = "\n".join(URGENT_MESSAGES[f] for f in t.risk_flags if f in URGENT_MESSAGES) or None

    removed: list[str] = []
    check_passed = True
    if not hits:
        draft = Draft(answer=NOT_FOUND, cited_ids=[], provider="none", needs_lawyer=True)
    else:
        chosen = provider or _choose_provider(settings, t.category)
        if chosen.name != "claude" and settings.llm_provider == "claude":
            notes.append("kept_on_server_sensitive_category")
        try:
            draft = chosen.answer(red.text, t.category, hits)
        except Exception as exc:  # ProviderRefused, ProviderFailed, API/network errors: degrade, never fail
            log.warning("provider %s failed: %s", chosen.name, exc)
            notes.append(f"provider_fallback:{type(exc).__name__}")
            draft = ExtractiveProvider().answer(red.text, t.category, hits)
        cited_hits = [h for h in hits if h.provision_id in set(draft.cited_ids)] or hits
        allowed = {h.article_number for h in cited_hits if h.article_number is not None}
        if draft.provider != "extractive":
            check = verify(draft.answer, allowed)
            check_passed, removed = check.passed, check.removed
            if not check.passed:
                notes.append(f"removed_{len(check.removed)}_unverified_sentences")
                if check.text:
                    draft.answer = check.text
                else:
                    draft = ExtractiveProvider().answer(red.text, t.category, hits)
                    draft.answer = ALL_REMOVED + "\n\n" + draft.answer
        notes += draft.notes
    _log(conn, red.text, t.category, t.risk_flags, draft, hits, check_passed, removed, consent_for_review)

    by_id = {h.provision_id: h for h in hits}
    citations = [
        Citation(h.provision_id, h.label, h.doc_title, h.legal_status, h.source_url,
                 " ".join(h.text.split())[:600], h.reviewed_at)
        for h in (by_id[i] for i in draft.cited_ids if i in by_id)
    ]
    return AssistantAnswer(
        answer=draft.answer, disclaimer=DISCLAIMER, category=t.category, risk_flags=t.risk_flags,
        urgent_notice=urgent_notice,
        offer_lawyer=t.urgent or draft.needs_lawyer or t.category in SENSITIVE_CATEGORIES or not hits,
        suggested_specialty=draft.suggested_specialty or (t.category if t.category != "general" else None),
        citations=citations, provider=draft.provider, citation_check_passed=check_passed, notes=notes,
    )


def _log(conn, question_redacted, category, flags, draft, hits, passed, removed, consent) -> None:
    conn.execute(
        """INSERT INTO assistant_log (question_redacted, category, risk_flags, provider, retrieved_provision_ids,
             citation_check_passed, removed_citations, answer, consent_for_review)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
        (question_redacted, category, flags, draft.provider, [h.provision_id for h in hits], passed, removed,
         draft.answer, consent),
    )
