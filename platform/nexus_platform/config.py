from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PLATFORM_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="NEXUS_", env_file=".env", extra="ignore")

    database_url: str = "postgresql://nexus:nexus@localhost:5432/nexus"
    raw_storage_dir: Path = PLATFORM_ROOT / "data" / "raw"
    registry_path: Path = PLATFORM_ROOT / "sources" / "registry.yaml"

    # Crawler politeness
    user_agent: str = "MNexusLegalBot/1.0 (+contact: set NEXUS_CRAWLER_CONTACT)"
    crawler_contact: str = ""
    request_delay_seconds: float = 3.0
    request_timeout_seconds: float = 30.0

    # Reviewer access for Phase 1 (comma-separated "name:token" pairs). Replace with real auth in Phase 2.
    reviewer_tokens: str = ""

    # Assistant
    llm_provider: str = "extractive"   # extractive | claude
    claude_model: str = "claude-opus-5-5"
    claude_effort: str = "medium"
    # Branches that never leave the server even after redaction (PDPL cross-border transfer risk).
    local_only_categories: str = "criminal,personal_status,health"
    retrieval_top_k: int = 8

    @property
    def reviewers(self) -> dict[str, str]:
        out: dict[str, str] = {}
        for pair in filter(None, (p.strip() for p in self.reviewer_tokens.split(","))):
            name, _, token = pair.partition(":")
            if name and len(token) >= 24:
                out[token] = name
        return out

    @property
    def local_only(self) -> set[str]:
        return {c.strip() for c in self.local_only_categories.split(",") if c.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
