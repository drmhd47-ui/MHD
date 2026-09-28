"""Turn fetched bytes (HTML / PDF / text / JSON feed) into ParsedDocument objects.

Parsing is deliberately conservative: anything uncertain becomes a parse warning that the
human reviewer sees before the version is approved. Nothing is guessed silently.
"""
from __future__ import annotations

import io
import json
import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup

from ..arabic import clean, match_article_header, normalize
from ..models import DocType, LegalStatus, ParsedDocument, ParsedProvision
from ..redaction import redact

PREAMBLE_LABEL = "الديباجة"

_INSTRUMENT = re.compile(
    r"(?P<kind>المرسوم الملكي|مرسوم ملكي|الأمر الملكي|أمر ملكي|الأمر السامي|أمر سامي|"
    r"قرار مجلس الوزراء|القرار الوزاري|قرار وزاري)\s+(?:الكريم\s+)?رقم\s*\(?\s*(?P<no>[^\s)]+)\s*\)?\s*"
    r"(?:و?بتاريخ|و?تاريخ)\s*(?P<date>[0-9٠-٩]{1,4}\s*/\s*[0-9٠-٩]{1,2}\s*/\s*[0-9٠-٩]{1,4})\s*هـ?"
)

_TITLE_TYPES = [
    (re.compile(r"^اللائحة|^لائحة"), DocType.REGULATION),
    (re.compile(r"^نظام\b|^النظام\b"), DocType.LAW),
    (re.compile(r"^تنظيم\b"), DocType.ORGANIZATION),
    (re.compile(r"^أمر ملكي|^الأمر الملكي"), DocType.ROYAL_ORDER),
    (re.compile(r"^مرسوم ملكي|^المرسوم الملكي"), DocType.ROYAL_DECREE),
    (re.compile(r"^قرار مجلس الوزراء"), DocType.COUNCIL_DECISION),
    (re.compile(r"^قرار وزاري|^القرار الوزاري|^قرار معالي"), DocType.MINISTERIAL_DECISION),
    (re.compile(r"^تعميم"), DocType.CIRCULAR),
    (re.compile(r"^نموذج"), DocType.FORM),
    (re.compile(r"^دليل"), DocType.GUIDE),
]

_DECISION_SECTIONS = re.compile(r"^(?:الوقائع|الأسباب|أسباب الحكم|نص الحكم|منطوق الحكم|الحكم|المبدأ|ملخص المبدأ)\s*[:：]?\s*$")


@dataclass
class ExtractedPage:
    title: str
    text: str
    links: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def guess_doc_type(title: str, default: DocType = DocType.OTHER) -> DocType:
    t = title.strip()
    for pattern, doc_type in _TITLE_TYPES:
        if pattern.search(t):
            return doc_type
    return default


def extract_instrument(text: str) -> tuple[str | None, str | None]:
    """Return (instrument as written, hijri date) from the first match in the text head."""
    m = _INSTRUMENT.search(text[:4000])
    if not m:
        return None, None
    date = re.sub(r"\s+", "", m.group("date"))
    return m.group(0).strip(), date


def split_provisions(text: str) -> tuple[list[ParsedProvision], list[str]]:
    """Split legislation text into a preamble plus one provision per article header."""
    provisions: list[ParsedProvision] = []
    warnings: list[str] = []
    current_label, current_number, current_repeat = PREAMBLE_LABEL, None, False
    buf: list[str] = []

    def flush() -> None:
        body = "\n".join(buf).strip()
        if body or current_number is not None:
            provisions.append(ParsedProvision(
                seq=len(provisions), label=current_label, text=body,
                article_number=current_number, is_repeat=current_repeat,
            ))

    for line in text.splitlines():
        header = match_article_header(line)
        if header:
            flush()
            buf = []
            current_number, current_label, current_repeat = header
            rest = re.split(r"[:：]", line, maxsplit=1)
            if len(rest) == 2 and rest[1].strip():
                buf.append(rest[1].strip())
            continue
        buf.append(line)
    flush()

    numbers = [p.article_number for p in provisions if p.article_number is not None and not p.is_repeat]
    if not numbers:
        warnings.append("no_articles_detected")
    else:
        if numbers[0] != 1:
            warnings.append(f"first_article_is_{numbers[0]}")
        seen: set[int] = set()
        for prev, cur in zip(numbers, numbers[1:]):
            if cur in seen or cur == prev:
                warnings.append(f"duplicate_article_{cur}")
            elif cur != prev + 1:
                warnings.append(f"numbering_gap_{prev}_to_{cur}")
            seen.add(prev)
    for p in provisions:
        if p.article_number is not None and not p.text:
            warnings.append(f"empty_article_{p.article_number}")
    return provisions, warnings


def split_decision(text: str) -> list[ParsedProvision]:
    """Split a judicial decision into its customary sections; fall back to one block."""
    sections: list[ParsedProvision] = []
    label, buf = "نص القرار", []
    for line in text.splitlines():
        if _DECISION_SECTIONS.match(line.strip()):
            if "\n".join(buf).strip():
                sections.append(ParsedProvision(seq=len(sections), label=label, text="\n".join(buf).strip()))
            label, buf = line.strip().rstrip(":："), []
        else:
            buf.append(line)
    if "\n".join(buf).strip():
        sections.append(ParsedProvision(seq=len(sections), label=label, text="\n".join(buf).strip()))
    return sections


# --- Format extractors -----------------------------------------------------------------

_DROP_TAGS = ["script", "style", "noscript", "nav", "header", "footer", "form", "iframe", "svg"]


def extract_html(html: str | bytes, selectors: dict | None = None, base_url: str | None = None) -> ExtractedPage:
    from urllib.parse import urljoin

    selectors = selectors or {}
    soup = BeautifulSoup(html, "lxml")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"].strip()
        if href and not href.startswith(("javascript:", "mailto:", "#")):
            links.append(urljoin(base_url, href) if base_url else href)

    title = ""
    for sel in selectors.get("title", []) + ["h1", "title"]:
        node = soup.select_one(sel)
        if node and node.get_text(strip=True):
            title = clean(node.get_text(" ", strip=True))
            break

    for tag in soup(_DROP_TAGS):
        tag.decompose()

    warnings: list[str] = []
    body = None
    for sel in selectors.get("body", []):
        nodes = soup.select(sel)
        if nodes:
            body = "\n\n".join(n.get_text("\n", strip=True) for n in nodes)
            break
    if body is None:
        if selectors.get("body"):
            warnings.append("body_selector_not_found_used_heuristic")
        body = _heuristic_body(soup)
    return ExtractedPage(title=title, text=clean(body), links=links, warnings=warnings)


def _heuristic_body(soup: BeautifulSoup) -> str:
    """Pick the block with the most article headers, else the one with the most text."""
    candidates = soup.find_all(["main", "article", "section", "div", "td"]) or [soup]
    best, best_score = soup, (-1, -1)
    for node in candidates:
        text = node.get_text("\n", strip=True)
        headers = sum(1 for ln in text.splitlines() if match_article_header(ln))
        # prefer the smallest node that still holds all headers: penalize by length only on ties
        score = (headers, -len(text) if headers else len(text))
        if score > best_score:
            best, best_score = node, score
    return best.get_text("\n", strip=True)


_COMMON_WORDS = {"في", "من", "علي", "الي", "ان", "المادة", "ماده", "هذا", "التي", "الذي", "او", "مع"}


def extract_pdf(data: bytes) -> ExtractedPage:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = [(page.extract_text() or "") for page in reader.pages]
    text = clean("\n".join(pages))
    warnings = []
    if not text.strip():
        warnings.append("pdf_has_no_text_layer_needs_ocr")
    else:
        words = normalize(text).split()
        hits = sum(1 for w in words[:3000] if w in {normalize(c) for c in _COMMON_WORDS})
        if words and hits / min(len(words), 3000) < 0.02:
            warnings.append("pdf_text_may_be_reversed_or_garbled")
    first_line = next((ln for ln in text.splitlines() if ln.strip()), "")
    return ExtractedPage(title=first_line[:200], text=text, warnings=warnings)


def extract_text(data: bytes) -> ExtractedPage:
    text = clean(data.decode("utf-8-sig", errors="replace"))
    first_line = next((ln for ln in text.splitlines() if ln.strip()), "")
    return ExtractedPage(title=first_line.lstrip("# ").strip()[:200], text=text)


def extract(data: bytes, content_type: str, selectors: dict | None = None, base_url: str | None = None) -> ExtractedPage:
    ct = content_type.lower()
    if "pdf" in ct:
        return extract_pdf(data)
    if "html" in ct or "xml" in ct:
        return extract_html(data, selectors, base_url)
    return extract_text(data)


# --- Assembly --------------------------------------------------------------------------

def build_document(
    page: ExtractedPage,
    *,
    external_id: str,
    source_url: str | None,
    default_type: DocType,
    issuing_authority: str | None = None,
    branches: list[str] | None = None,
    legal_status: LegalStatus = LegalStatus.UNKNOWN,
) -> ParsedDocument:
    title = page.title or "(بلا عنوان)"
    doc_type = guess_doc_type(title, default_type)
    warnings = list(page.warnings)
    text = page.text

    if doc_type in (DocType.JUDICIAL_DECISION, DocType.JUDICIAL_PRINCIPLE):
        redacted = redact(text)
        if redacted.counts:
            warnings.append("pii_redacted:" + ",".join(f"{k}={v}" for k, v in sorted(redacted.counts.items())))
        warnings.append("judicial_text_manual_name_check_required")
        text = redacted.text
        provisions = split_decision(text)
    else:
        provisions, parse_warnings = split_provisions(text)
        if doc_type in (DocType.FORM, DocType.GUIDE, DocType.PROFESSIONAL_PUBLICATION, DocType.CIRCULAR) \
                and "no_articles_detected" in parse_warnings:
            parse_warnings.remove("no_articles_detected")
        warnings += parse_warnings

    instrument, hijri = extract_instrument(text)
    if not title.strip() or title == "(بلا عنوان)":
        warnings.append("missing_title")
    return ParsedDocument(
        external_id=external_id, title=title, doc_type=doc_type, full_text=text,
        provisions=provisions, source_url=source_url, issuing_authority=issuing_authority,
        instrument=instrument, issue_date_hijri=hijri, legal_status=legal_status,
        branches=list(branches or []), warnings=warnings,
    )


def parse_json_feed(data: bytes, default_type: DocType) -> list[ParsedDocument]:
    """Structured feed format for official data-sharing agreements (see platform/README.md)."""
    payload = json.loads(data.decode("utf-8-sig"))
    items = payload["documents"] if isinstance(payload, dict) else payload
    docs = []
    for item in items:
        articles = item.get("articles") or []
        provisions = []
        if item.get("preamble"):
            provisions.append(ParsedProvision(seq=0, label=PREAMBLE_LABEL, text=clean(item["preamble"])))
        for a in articles:
            header = match_article_header(a["label"] + ":")
            provisions.append(ParsedProvision(
                seq=len(provisions), label=a["label"], text=clean(a["text"]),
                article_number=a.get("number") or (header[0] if header else None),
                is_repeat=bool(header and header[2]),
            ))
        full_text = "\n\n".join(f"{p.label}:\n{p.text}" if p.article_number else p.text for p in provisions)
        docs.append(ParsedDocument(
            external_id=str(item["id"]), title=clean(item["title"]),
            doc_type=DocType(item.get("doc_type", default_type.value)),
            full_text=full_text, provisions=provisions, source_url=item.get("url"),
            issuing_authority=item.get("issuing_authority"), instrument=item.get("instrument"),
            issue_date_hijri=item.get("issue_date_hijri"),
            legal_status=LegalStatus(item.get("legal_status", "unknown")),
            branches=item.get("branches", []),
        ))
    return docs
