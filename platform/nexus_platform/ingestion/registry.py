from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from ..models import DocType, LegalStatus

ACCESS_LEVELS = {"public_web", "requires_agreement", "manual_only", "not_public"}
CONNECTORS = {"crawler", "files"}


@dataclass
class Source:
    id: str
    name_ar: str
    owner_ar: str
    access: str
    connector: str
    default_doc_type: DocType
    base_url: str | None = None
    covers: list[str] = field(default_factory=list)
    issuing_authority: str | None = None
    legal_status: LegalStatus = LegalStatus.UNKNOWN
    seeds: list[str] = field(default_factory=list)
    follow_patterns: list[re.Pattern[str]] = field(default_factory=list)
    document_patterns: list[re.Pattern[str]] = field(default_factory=list)
    selectors: dict = field(default_factory=dict)
    render: str = "http"
    schedule: str | None = None
    calibrated: bool = False
    enabled: bool = False
    max_pages_per_run: int = 500
    notes: str | None = None

    def document_id_for(self, url: str) -> str | None:
        for rx in self.document_patterns:
            m = rx.match(url)
            if m:
                return m.groupdict().get("id") or url
        return None

    def should_follow(self, url: str) -> bool:
        return any(rx.match(url) for rx in self.follow_patterns)


def load_registry(path: Path) -> dict[str, Source]:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    defaults = raw.get("defaults", {})
    out: dict[str, Source] = {}
    for item in raw["sources"]:
        item = {**defaults, **item}
        if item["access"] not in ACCESS_LEVELS:
            raise ValueError(f"{item['id']}: unknown access {item['access']}")
        if item["connector"] not in CONNECTORS:
            raise ValueError(f"{item['id']}: unknown connector {item['connector']}")
        if item["connector"] == "crawler" and item["access"] in {"not_public", "manual_only"}:
            raise ValueError(f"{item['id']}: a crawler is not allowed for access={item['access']}")
        if item["id"] in out:
            raise ValueError(f"duplicate source id {item['id']}")
        out[item["id"]] = Source(
            id=item["id"], name_ar=item["name_ar"], owner_ar=item["owner_ar"],
            access=item["access"], connector=item["connector"],
            default_doc_type=DocType(item.get("default_doc_type", "other")),
            base_url=item.get("base_url"), covers=item.get("covers", []),
            issuing_authority=item.get("issuing_authority"),
            legal_status=LegalStatus(item.get("legal_status", "unknown")),
            seeds=item.get("seeds", []),
            follow_patterns=[re.compile(p) for p in item.get("follow_patterns", [])],
            document_patterns=[re.compile(p) for p in item.get("document_patterns", [])],
            selectors={"title": [], "body": [], **(item.get("selectors") or {})},
            render=item.get("render", "http"), schedule=item.get("schedule"),
            calibrated=bool(item.get("calibrated", False)), enabled=bool(item.get("enabled", False)),
            max_pages_per_run=int(item.get("max_pages_per_run", 500)), notes=item.get("notes"),
        )
    return out
