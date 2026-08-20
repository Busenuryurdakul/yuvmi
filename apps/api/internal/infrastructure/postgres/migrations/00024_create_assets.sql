-- +goose Up
CREATE TABLE IF NOT EXISTS assets (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id                UUID REFERENCES spaces(id) ON DELETE SET NULL,
    type                    VARCHAR(50) NOT NULL,
    title                   VARCHAR(255) NOT NULL,
    storage_key             VARCHAR(512) NOT NULL,
    mime_type               VARCHAR(128) NOT NULL,
    file_size               BIGINT NOT NULL DEFAULT 0,
    visibility              VARCHAR(50) NOT NULL DEFAULT 'private',
    revoked_from_space_at   TIMESTAMPTZ,
    ai_processing_allowed   BOOLEAN NOT NULL DEFAULT false,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_owner ON assets(owner_id, created_at DESC);
CREATE INDEX idx_assets_space ON assets(space_id, created_at DESC) WHERE revoked_from_space_at IS NULL;

CREATE TABLE IF NOT EXISTS space_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    grantee_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action          VARCHAR(50) NOT NULL DEFAULT 'view',
    visibility      VARCHAR(50) NOT NULL,
    granted_by_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (space_id, asset_id, grantee_id)
);

CREATE INDEX idx_space_permissions_asset ON space_permissions(asset_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_space_permissions_grantee ON space_permissions(grantee_id) WHERE revoked_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS space_permissions;
DROP TABLE IF EXISTS assets;
