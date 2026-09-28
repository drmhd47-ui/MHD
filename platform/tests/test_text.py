from nexus_platform.arabic import match_article_header, normalize, parse_ordinal
from nexus_platform.assistant.citations import referenced_numbers, verify
from nexus_platform.assistant.triage import triage
from nexus_platform.ingestion.parsers import extract_instrument, split_decision, split_provisions
from nexus_platform.redaction import redact


def test_ordinals():
    cases = {
        "الأولى": 1, "العاشرة": 10, "الحادية عشرة": 11, "الثانية عشرة": 12, "العشرون": 20,
        "الحادية والعشرون": 21, "التاسعة والتسعون": 99, "المائة": 100, "الأولى بعد المائة": 101,
        "الحادية والعشرون بعد المائة": 121, "المائتان": 200, "الثانية بعد المائتين": 202,
        "الأولى بعد الثلاثمائة": 301, "الخامسةُ": 5,
    }
    for phrase, n in cases.items():
        assert parse_ordinal(phrase) == n, phrase
    assert parse_ordinal("التي") is None


def test_article_headers():
    assert match_article_header("المادة الأولى:") == (1, "المادة الأولى", False)
    assert match_article_header("المادة (77): نص")[0] == 77
    assert match_article_header("المادة ٣٥")[0] == 35
    assert match_article_header("المادة الرابعة مكرر:") == (4, "المادة الرابعة مكرر", True)
    assert match_article_header("مادة 5 - نص")[:2] == (5, "مادة 5")
    # references inside prose are not headers
    assert match_article_header("المادة (5) من نظام المرافعات تنص على") is None
    assert match_article_header("المادة التي تنص على أن العامل يستحق") is None


def test_normalize():
    assert normalize("الْمَادَّةُ الأُولَى") == "الماده الاولي"
    assert normalize("١٤٤٥/١/١") == "1445/1/1"


def test_split_provisions_and_warnings():
    text = "ديباجة\nالمادة الأولى:\nنص أول\nالمادة الثانية: نص ثانٍ\nالمادة الرابعة:\nنص رابع"
    provisions, warnings = split_provisions(text)
    assert [p.label for p in provisions] == ["الديباجة", "المادة الأولى", "المادة الثانية", "المادة الرابعة"]
    assert provisions[2].text == "نص ثانٍ"
    assert "numbering_gap_2_to_4" in warnings
    _, warnings = split_provisions("نص بلا مواد")
    assert warnings == ["no_articles_detected"]


def test_instrument():
    instrument, date = extract_instrument("صادر بالمرسوم الملكي رقم (م/51) وتاريخ 1426/8/23هـ وبعد")
    assert instrument.startswith("المرسوم الملكي رقم (م/51)")
    assert date == "1426/8/23"


def test_decision_sections():
    sections = split_decision("مقدمة\nالوقائع:\nأ\nالأسباب:\nب\nمنطوق الحكم:\nج")
    assert [s.label for s in sections] == ["نص القرار", "الوقائع", "الأسباب", "منطوق الحكم"]


def test_redaction():
    r = redact("هويتي 1012345678 وجوالي 0551234567 وبريدي a.b@x.com وآيبان SA03 8000 0000 6080 1016 7519 وهاتف ٠١١٤٦٥٠٠٠٠")
    assert "1012345678" not in r.text and "0551234567" not in r.text and "a.b@x.com" not in r.text
    assert "SA03" not in r.text and "0114650000" not in r.text
    assert r.counts == {"national_id": 1, "phone": 1, "email": 1, "iban": 1, "landline": 1}
    # article numbers and years must survive
    assert redact("المادة 77 لعام 1445").text == "المادة 77 لعام 1445"


def test_triage():
    t = triage("فصلوني من العمل بدون سبب وما عطوني نهاية الخدمة")
    assert t.category == "labor" and not t.urgent
    t = triage("أخوي موقوف عند النيابة من أمس")
    assert t.category == "criminal" and "detention" in t.risk_flags and t.urgent
    t = triage("زوجي يضربني وأبي الطلاق والحضانة")
    assert t.category == "personal_status" and {"violence", "minor"} <= set(t.risk_flags)
    assert triage("سؤال عام").category == "general"


def test_citation_verifier():
    assert referenced_numbers("وفق المادة (3) والمادة الحادية عشرة") == {3, 11}
    check = verify("تنص المادة الثالثة على الإشعار. كما أن المادة (99) تمنح تعويضاً. قضيتك رابحة.", {3})
    assert check.text == "تنص المادة الثالثة على الإشعار."
    assert not check.passed and len(check.removed) == 2
    assert verify("صدر حكم رقم 43012345 بذلك.", {1}).text == ""
    assert verify("تنص المادة الثالثة على ذلك.", {3}).passed
