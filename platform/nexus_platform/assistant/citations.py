"""Post-generation guardrail: every article/decision number in an answer must exist in the
retrieved provisions. Sentences carrying an unverifiable reference are removed, never kept."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..arabic import normalize, parse_ordinal

_SENTENCE_SPLIT = re.compile(r"(?<=[.!؟?\n])\s+")
_NUMERIC_REF = re.compile(r"(?:ال)?ماد(?:ه|تين|تان|تي)\s*(?:رقم\s*)?\(?\s*(\d+)\s*\)?")
_WORD_REF = re.compile(r"(?:ال)?ماده\s+")
_LONG_NUMBER = re.compile(r"(?<!\d)\d{7,}(?!\d)")   # case/decision numbers the model might invent
_ADVICE = [normalize(p) for p in (
    "قضيتك رابحة", "قضيتك خاسرة", "ستكسب", "ستخسر", "سوف تكسب", "سوف تخسر", "مضمون",
    "يجب عليك رفع دعوى", "ارفع دعوى فوراً", "أنصحك برفع", "لا تحتاج محامي", "لا تحتاج إلى محامٍ",
)]


@dataclass
class CitationCheck:
    text: str
    passed: bool
    removed: list[str] = field(default_factory=list)


def referenced_numbers(sentence: str) -> set[int]:
    s = normalize(sentence)
    nums = {int(n) for n in _NUMERIC_REF.findall(s)}
    for m in _WORD_REF.finditer(s):
        tokens = [t for t in (re.sub(r"[^\u0621-\u064A]", "", w) for w in s[m.end():].split()[:6]) if t]
        # Longest prefix that parses as an ordinal (the phrase may run into ordinary words).
        for end in range(len(tokens), 0, -1):
            n = parse_ordinal(" ".join(tokens[:end]))
            if n:
                nums.add(n)
                break
    return nums


def verify(answer: str, allowed_articles: set[int]) -> CitationCheck:
    kept, removed = [], []
    for sentence in _SENTENCE_SPLIT.split(answer.strip()):
        if not sentence.strip():
            continue
        norm = normalize(sentence)
        bad_refs = referenced_numbers(sentence) - allowed_articles
        if bad_refs or _LONG_NUMBER.search(norm) or any(a in norm for a in _ADVICE):
            removed.append(sentence.strip())
            continue
        kept.append(sentence.strip())
    return CitationCheck(" ".join(kept).strip(), passed=not removed, removed=removed)
