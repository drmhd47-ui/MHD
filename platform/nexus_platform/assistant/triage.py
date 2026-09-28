"""Deterministic, on-server triage: category + risk flags.

Runs before any model call and never depends on an external service, so urgent cases are
routed to a human even if the LLM is down, refuses, or is disabled.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..arabic import normalize

CATEGORIES: dict[str, list[str]] = {
    "labor": ["عامل", "العمال", "راتب", "رواتب", "اجر", "فصل تعسفي", "فصلني", "فصلوني", "نهايه الخدمه",
              "مكافاه نهايه", "صاحب العمل", "عقد عمل", "عقد العمل", "اجازه", "استقاله", "كفيل", "مكتب العمل"],
    "personal_status": ["طلاق", "طلقني", "خلع", "نفقه", "حضانه", "زواج", "زوجي", "زوجتي", "طليقي", "طليقتي",
                        "ميراث", "تركه", "ورثه", "الورثه", "وصيه", "ولايه", "عضل", "رؤيه الاطفال", "زياره الاطفال"],
    "criminal": ["جريمه", "جنائي", "جنائيه", "تهمه", "متهم", "موقوف", "توقيف", "النيابه", "سرقه", "احتيال",
                 "نصب", "مخدرات", "تشهير", "ابتزاز", "اعتداء", "قبض", "بلاغ"],
    "commercial": ["شركه", "شريك", "الشركاء", "سجل تجاري", "شيك", "كمبياله", "سند لامر", "تاجر", "افلاس",
                   "وكاله تجاريه", "علامه تجاريه", "امتياز تجاري"],
    "real_estate": ["عقار", "ايجار", "مستاجر", "المستاجر", "مؤجر", "المؤجر", "صك", "ارض", "اخلاء", "ايجار",
                    "وحده سكنيه", "شقه"],
    "administrative": ["جهه حكوميه", "قرار اداري", "ديوان المظالم", "موظف حكومي", "الخدمه المدنيه", "تظلم"],
    "traffic": ["مرور", "المرور", "حادث", "مخالفه مروريه", "رخصه قياده", "ساهر", "تصادم", "نجم"],
    "enforcement": ["تنفيذ", "سند تنفيذي", "حجز", "ايقاف خدمات", "المماطله", "محكمه التنفيذ"],
    "health": ["خطا طبي", "مستشفي", "طبيب", "علاج", "دواء", "الصحه"],
}

RISK_TERMS: dict[str, list[str]] = {
    "detention": ["موقوف", "موقوفه", "توقيف", "قبضوا", "القبض علي", "قبض علي", "محتجز", "مسجون", "حبس",
                  "في السجن", "بالسجن", "التحقيق معي", "استدعاء من النيابه"],
    "deadline": ["مهله", "اخر يوم", "آخر موعد", "ينتهي الموعد", "جلسه بكره", "جلسه غدا", "الجلسه بكره",
                 "الجلسه غدا", "موعد الاعتراض", "مده الاعتراض", "مده الاستئناف", "خلال ثلاثين يوم"],
    "violence": ["عنف", "يضربني", "ضربني", "يضربنا", "تهديد", "يهددني", "هددني", "ايذاء", "تحرش", "اعتداء"],
    "self_harm": ["انتحار", "انتحر", "اقتل نفسي", "انهي حياتي", "اؤذي نفسي"],
    "minor": ["طفل", "اطفال", "قاصر", "حضانه", "ابني", "بنتي", "عيالي"],
}

URGENT_FLAGS = {"detention", "deadline", "violence", "self_harm"}

_PREFIX = r"(?:^|(?<=\s))(?:و|ف|ب|ل|ك)?(?:ال|لل)?"


def _compile(terms: list[str]) -> re.Pattern[str]:
    parts = []
    for t in sorted({normalize(x) for x in terms}, key=len, reverse=True):
        esc = re.escape(t)
        parts.append(esc if " " in t else _PREFIX + esc)
    return re.compile("|".join(parts))


_CAT_RX = {k: _compile(v) for k, v in CATEGORIES.items()}
_RISK_RX = {k: _compile(v) for k, v in RISK_TERMS.items()}


@dataclass
class Triage:
    category: str
    risk_flags: list[str] = field(default_factory=list)
    scores: dict[str, int] = field(default_factory=dict)

    @property
    def urgent(self) -> bool:
        return bool(URGENT_FLAGS.intersection(self.risk_flags))


def triage(question: str) -> Triage:
    text = normalize(question)
    scores = {k: len(rx.findall(text)) for k, rx in _CAT_RX.items()}
    scores = {k: v for k, v in scores.items() if v}
    category = max(scores, key=lambda k: scores[k]) if scores else "general"
    flags = [k for k, rx in _RISK_RX.items() if rx.search(text)]
    return Triage(category=category, risk_flags=flags, scores=scores)


URGENT_MESSAGES = {
    "self_harm": "إن كنت تفكر في إيذاء نفسك أو كنت في خطر الآن، اتصل فوراً بأرقام الطوارئ (911 في المناطق "
                 "المشمولة بالرقم الموحد، أو 997 للهلال الأحمر) أو توجّه لأقرب طوارئ. سلامتك أهم من أي مسألة نظامية.",
    "violence": "إن كنت في خطر مباشر الآن فاتصل بالطوارئ (911 في المناطق المشمولة بالرقم الموحد، أو 999 للشرطة). "
                "سنوجّهك لمحامٍ مختص بأسرع وقت.",
    "detention": "حالات التوقيف والتحقيق حساسة للوقت. نوصي بالتواصل مع محامٍ فوراً — سنعرض عليك الربط بمحامٍ متاح الآن.",
    "deadline": "يبدو أن لديك موعداً أو مهلة نظامية قريبة. المواعيد النظامية قد يسقط الحق بفواتها، "
                "لذلك نوصي بمحامٍ فوراً بدل الاعتماد على معلومات عامة.",
}
