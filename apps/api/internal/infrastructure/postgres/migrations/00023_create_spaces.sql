-- +goose Up
CREATE TABLE IF NOT EXISTS spaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    status      VARCHAR(50) NOT NULL DEFAULT 'draft',
    features    JSONB NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spaces_owner ON spaces(owner_id);

CREATE TABLE IF NOT EXISTS space_memberships (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id    UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(50) NOT NULL DEFAULT 'member',
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    joined_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (space_id, user_id)
);

CREATE INDEX idx_space_memberships_user ON space_memberships(user_id, status);
CREATE INDEX idx_space_memberships_space ON space_memberships(space_id, status);

CREATE TABLE IF NOT EXISTS space_invites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id        UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    inviter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email   VARCHAR(255) NOT NULL,
    invitee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'member',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    token           VARCHAR(64) NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_space_invites_email ON space_invites(invitee_email, status);
CREATE INDEX idx_space_invites_space ON space_invites(space_id, status);

-- +goose Down
DROP TABLE IF EXISTS space_invites;
DROP TABLE IF EXISTS space_memberships;
DROP TABLE IF EXISTS spaces;
