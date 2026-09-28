from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class DocType(str, Enum):
    LAW = "law"                                  # نظام
    REGULATION = "regulation"                    # لائحة تنفيذية / تنظيمية
    ROYAL_DECREE = "royal_decree"                # مرسوم ملكي
    ROYAL_ORDER = "royal_order"                  # أمر ملكي
    HIGH_ORDER = "high_order"                    # أمر سامٍ
    COUNCIL_DECISION = "council_decision"        # قرار مجلس الوزراء
    MINISTERIAL_DECISION = "ministerial_decision"
    CIRCULAR = "circular"                        # تعميم
    ORGANIZATION = "organization"                # تنظيم هيئة / جهة
    JUDICIAL_DECISION = "judicial_decision"      # حكم قضائي
    JUDICIAL_PRINCIPLE = "judicial_principle"    # مبدأ قضائي
    FORM = "form"                                # نموذج عدلي/قضائي
    GUIDE = "guide"                              # دليل إجرائي
    PROFESSIONAL_PUBLICATION = "professional_publication"  # إصدارات هيئة المحامين ونحوها
    FIQH_REFERENCE = "fiqh_reference"            # مرجع فقهي/تاريخي (ليس نظاماً نافذاً)
    OTHER = "other"


class LegalStatus(str, Enum):
    IN_FORCE = "in_force"
    AMENDED = "amended"
    REPEALED = "repealed"
    HISTORICAL = "historical"   # e.g. مجلة الأحكام العدلية — reference only, not law in force in KSA
    UNKNOWN = "unknown"


@dataclass
class ParsedProvision:
    seq: int
    label: str
    text: str
    article_number: int | None = None
    is_repeat: bool = False


@dataclass
class ParsedDocument:
    external_id: str
    title: str
    doc_type: DocType
    full_text: str
    provisions: list[ParsedProvision]
    source_url: str | None = None
    issuing_authority: str | None = None
    instrument: str | None = None
    issue_date_hijri: str | None = None
    legal_status: LegalStatus = LegalStatus.UNKNOWN
    branches: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
