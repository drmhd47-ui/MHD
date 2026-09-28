"""Arabic text utilities: search normalization and article-number parsing.

The original text is always stored verbatim. Normalization here is only used
to build search keys and to recognize article headers.
"""
from __future__ import annotations

import re
import unicodedata

_TASHKEEL = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭ]")
_TATWEEL = "ـ"
_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_LETTERS = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي"})
_SPACES = re.compile(r"\s+")


def to_ascii_digits(text: str) -> str:
    return text.translate(_DIGITS)


def clean(text: str) -> str:
    """Fix PDF/HTML artifacts without changing wording (safe for display)."""
    text = unicodedata.normalize("NFKC", text)  # folds Arabic presentation forms from PDFs
    text = text.replace(" ", " ").replace("‏", "").replace("‎", "").replace("﻿", "")
    lines = [_SPACES.sub(" ", ln).strip() for ln in text.splitlines()]
    out, blank = [], False
    for ln in lines:
        if not ln:
            if not blank and out:
                out.append("")
            blank = True
            continue
        out.append(ln)
        blank = False
    return "\n".join(out).strip()


def normalize(text: str) -> str:
    """Search key: no diacritics/tatweel, unified letter variants and digits."""
    text = unicodedata.normalize("NFKC", text)
    text = _TASHKEEL.sub("", text).replace(_TATWEEL, "")
    text = text.translate(_LETTERS).translate(_DIGITS)
    return _SPACES.sub(" ", text).strip()


# --- Article ordinals ("المادة الحادية والعشرون بعد المائة" -> 121) ----------------

_UNITS = {
    "اولي": 1, "اول": 1, "حاديه": 1, "حادي": 1,
    "ثانيه": 2, "ثاني": 2, "ثالثه": 3, "ثالث": 3, "رابعه": 4, "رابع": 4,
    "خامسه": 5, "خامس": 5, "سادسه": 6, "سادس": 6, "سابعه": 7, "سابع": 7,
    "ثامنه": 8, "ثامن": 8, "تاسعه": 9, "تاسع": 9, "عاشره": 10, "عاشر": 10,
}
_TEEN = {"عشره", "عشر"}
_TENS = {
    "عشرون": 20, "عشرين": 20, "ثلاثون": 30, "ثلاثين": 30, "اربعون": 40, "اربعين": 40,
    "خمسون": 50, "خمسين": 50, "ستون": 60, "ستين": 60, "سبعون": 70, "سبعين": 70,
    "ثمانون": 80, "ثمانين": 80, "تسعون": 90, "تسعين": 90,
}
_HUNDREDS = {
    "مائه": 100, "مئه": 100, "مايه": 100, "مائتين": 200, "مائتان": 200, "مئتين": 200, "مئتان": 200,
}
for _w, _v in (("ثلاث", 3), ("اربع", 4), ("خمس", 5), ("ست", 6), ("سبع", 7), ("ثمان", 8), ("تسع", 9)):
    _HUNDREDS[_w + "مائه"] = _v * 100
    _HUNDREDS[_w + "مئه"] = _v * 100


def _norm_keys(d: dict[str, int]) -> dict[str, int]:
    return {normalize(k): v for k, v in d.items()}


_UNITS, _TENS, _HUNDREDS = _norm_keys(_UNITS), _norm_keys(_TENS), _norm_keys(_HUNDREDS)


def _strip_al(word: str) -> str:
    word = word[1:] if word.startswith("و") and len(word) > 3 and word[1:3] == "ال" else word
    return word[2:] if word.startswith("ال") and len(word) > 3 else word


def parse_ordinal(phrase: str) -> int | None:
    """Parse a feminine ordinal phrase (normalized or not). Returns None if not an ordinal."""
    words = [_strip_al(w) for w in normalize(phrase).split()]
    if not words:
        return None
    total, seen = 0, False
    for w in words:
        if w == "بعد":
            continue
        if w in _UNITS:
            total += _UNITS[w]
        elif w in _TEEN:
            total += 10
        elif w in _TENS:
            total += _TENS[w]
        elif w in _HUNDREDS:
            total += _HUNDREDS[w]
        else:
            return None
        seen = True
    return total if seen and total > 0 else None


_ARTICLE_HEAD = re.compile(
    r"^\s*(?:ال)?ماد[هة]\s*(?:رقم\s*)?"
    r"(?:[\(\[]\s*(?P<num>\d+)\s*[\)\]]|(?P<num2>\d+)|(?P<words>(?:[^\s:：\-–—]+\s*){1,6}?))"
    r"\s*(?P<suffix>مكرر(?:\s*\(?\d+\)?)?|مكرره)?\s*(?:[:：\-–—]|$)"
)


def match_article_header(line: str) -> tuple[int, str, bool] | None:
    """Return (number, label, is_repeat) if the line starts an article, e.g. 'المادة الأولى:'.

    is_repeat marks inserted articles such as "المادة الثالثة والثلاثون مكرر".
    """
    norm = normalize(line)
    if len(norm) > 90 and ":" not in norm[:60]:
        return None
    m = _ARTICLE_HEAD.match(norm)
    if not m:
        return None
    num = m.group("num") or m.group("num2")
    if num:
        n = int(num)
    else:
        n = parse_ordinal(m.group("words") or "")
        if n is None:
            return None
    label = re.split(r"[:：]|\s[\-–—]", line, maxsplit=1)[0].strip()
    return n, label[:80], bool(m.group("suffix"))
