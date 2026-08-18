-- +goose Up
CREATE TABLE IF NOT EXISTS consents (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope         VARCHAR(64) NOT NULL,
    granted       BOOLEAN NOT NULL DEFAULT FALSE,
    resource_type VARCHAR(50),
    resource_id   UUID,
    granted_at    TIMESTAMPTZ,
    revoked_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per user+scope for account-wide consent. Per-resource consent
-- (Asset.aiProcessingAllowed, space consent) carries resource_id and is
-- excluded from this constraint so a user can hold both kinds at once.
CREATE UNIQUE INDEX idx_consents_user_scope
    ON consents(user_id, scope) WHERE resource_id IS NULL;

CREATE TABLE IF NOT EXISTS ai_jobs (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope                VARCHAR(64) NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'queued',
    -- SHA-256 of the prompt context, never the context itself: enough to spot
    -- duplicate work and debug caching without persisting what the user wrote.
    input_hash           CHAR(64) NOT NULL,
    output_resource_type VARCHAR(50),
    output_resource_id   UUID,
    error_code           VARCHAR(50),
    tokens_used          INTEGER,
    latency_ms           INTEGER,
    provider             VARCHAR(50),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at         TIMESTAMPTZ
);

-- Serves the per-user daily quota check, which filters on all three columns.
CREATE INDEX idx_ai_jobs_user_scope_created ON ai_jobs(user_id, scope, created_at);

-- +goose Down
DROP TABLE IF EXISTS ai_jobs;
DROP TABLE IF EXISTS consents;
