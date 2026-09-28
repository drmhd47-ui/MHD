-- M NEXUS Connect — Phase 1: legal knowledge base + assistant log.
-- PostgreSQL 16. Arabic full-text search uses the built-in 'arabic' snowball config
-- over a pre-normalized column (see nexus_platform/arabic.py:normalize).

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version    text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
);

-- Mirrors sources/registry.yaml (the registry file is the source of truth).
CREATE TABLE IF NOT EXISTS sources (
    id           text PRIMARY KEY,
    name_ar      text NOT NULL,
    owner_ar     text NOT NULL,
    access       text NOT NULL,            -- public_web | requires_agreement | manual_only | not_public
    connector    text NOT NULL,
    base_url     text,
    enabled      boolean NOT NULL DEFAULT false,
    last_run_at  timestamptz,
    last_run_status text,
    updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Every fetched or uploaded file, byte-for-byte, with its hash. Never modified.
CREATE TABLE IF NOT EXISTS raw_documents (
    id            bigserial PRIMARY KEY,
    source_id     text NOT NULL REFERENCES sources(id),
    url           text,                    -- NULL for manual uploads
    original_name text,
    fetched_at    timestamptz NOT NULL DEFAULT now(),
    sha256        text NOT NULL,
    content_type  text NOT NULL,
    storage_path  text NOT NULL,
    http_status   int,
    UNIQUE (source_id, sha256)
);

CREATE TABLE IF NOT EXISTS documents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id           text NOT NULL REFERENCES sources(id),
    external_id         text NOT NULL,     -- stable id at the source (URL path, GUID, or file hash)
    doc_type            text NOT NULL,     -- see nexus_platform/models.py:DocType
    title               text NOT NULL,
    title_normalized    text NOT NULL,
    issuing_authority   text,
    instrument          text,              -- e.g. "المرسوم الملكي رقم (م/51) وتاريخ 1426/8/23هـ" as written
    issue_date_hijri    text,
    legal_status        text NOT NULL DEFAULT 'unknown',  -- in_force | amended | repealed | historical | unknown
    branches            text[] NOT NULL DEFAULT '{}',     -- labor, commercial, personal_status, criminal, ...
    source_url          text,
    current_version_id  bigint,            -- latest APPROVED version (what the assistant may use)
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS documents_title_trgm ON documents USING gin (title_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS documents_type ON documents (doc_type);

-- A new version is created whenever the parsed content hash changes. Old versions are kept.
CREATE TABLE IF NOT EXISTS document_versions (
    id              bigserial PRIMARY KEY,
    document_id     uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_no      int NOT NULL,
    content_sha256  text NOT NULL,
    raw_document_id bigint REFERENCES raw_documents(id),
    full_text       text NOT NULL,          -- verbatim (after whitespace cleanup only)
    parse_warnings  text[] NOT NULL DEFAULT '{}',
    review_status   text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
    reviewed_by     text,
    reviewed_at     timestamptz,
    review_note     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_no)
);
CREATE INDEX IF NOT EXISTS document_versions_review ON document_versions (review_status, created_at);

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_current_version_fk;
ALTER TABLE documents ADD CONSTRAINT documents_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES document_versions(id) DEFERRABLE INITIALLY DEFERRED;

-- Articles (or sections for decisions/forms). Indexing unit for search and the assistant.
CREATE TABLE IF NOT EXISTS provisions (
    id               bigserial PRIMARY KEY,
    version_id       bigint NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    document_id      uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    seq              int NOT NULL,           -- order within the version
    article_number   int,                    -- NULL for preamble / non-article sections
    is_repeat        boolean NOT NULL DEFAULT false,  -- "مكرر"
    label            text NOT NULL,          -- "المادة الأولى" as written, or "الديباجة"
    text_original    text NOT NULL,
    text_normalized  text NOT NULL,
    tsv              tsvector GENERATED ALWAYS AS (to_tsvector('arabic', text_normalized)) STORED,
    UNIQUE (version_id, seq)
);
CREATE INDEX IF NOT EXISTS provisions_tsv ON provisions USING gin (tsv);
CREATE INDEX IF NOT EXISTS provisions_doc_article ON provisions (document_id, article_number);

-- Assistant turns. Only the REDACTED question is stored.
CREATE TABLE IF NOT EXISTS assistant_log (
    id                    bigserial PRIMARY KEY,
    created_at            timestamptz NOT NULL DEFAULT now(),
    question_redacted     text NOT NULL,
    category              text,
    risk_flags            text[] NOT NULL DEFAULT '{}',
    provider              text NOT NULL,
    retrieved_provision_ids bigint[] NOT NULL DEFAULT '{}',
    citation_check_passed boolean NOT NULL,
    removed_citations     text[] NOT NULL DEFAULT '{}',
    answer                text NOT NULL,
    consent_for_review    boolean NOT NULL DEFAULT false
);

-- Append-only audit trail for review and ingestion actions.
CREATE TABLE IF NOT EXISTS audit_log (
    id         bigserial PRIMARY KEY,
    at         timestamptz NOT NULL DEFAULT now(),
    actor      text NOT NULL,
    action     text NOT NULL,
    entity     text NOT NULL,
    entity_id  text NOT NULL,
    detail     jsonb NOT NULL DEFAULT '{}'
);

CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

INSERT INTO schema_migrations (version) VALUES ('001') ON CONFLICT DO NOTHING;
