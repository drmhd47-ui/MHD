"""Remove direct identifiers before text leaves the server or is stored in logs.

Limitation (by design, documented): personal NAMES cannot be removed reliably by pattern.
That is why sensitive categories never go to an external model at all (see assistant/service.py),
and why judicial texts are flagged for a manual name check before approval.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .arabic import to_ascii_digits

_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    ("email", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "[بريد]"),
    ("iban", re.compile(r"\bSA\d{2}(?:\s?[0-9A-Z]{4}){5}\b", re.IGNORECASE), "[آيبان]"),
    ("national_id", re.compile(r"(?<!\d)[12]\d{9}(?!\d)"), "[رقم هوية]"),
    ("phone", re.compile(r"(?<![\d+])(?:\+?966|00966|0)?\s?5\d(?:[\s-]?\d){7}(?!\d)"), "[جوال]"),
    ("landline", re.compile(r"(?<![\d+])(?:\+?966|00966|0)1\d(?:[\s-]?\d){6,7}(?!\d)"), "[هاتف]"),
]


@dataclass
class Redacted:
    text: str
    counts: dict[str, int] = field(default_factory=dict)


def redact(text: str) -> Redacted:
    out = to_ascii_digits(text)
    counts: dict[str, int] = {}
    for name, pattern, token in _PATTERNS:
        out, n = pattern.subn(token, out)
        if n:
            counts[name] = n
    return Redacted(out, counts)
