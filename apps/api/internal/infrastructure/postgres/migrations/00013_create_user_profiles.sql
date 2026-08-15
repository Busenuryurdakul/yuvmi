-- +goose Up
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id              UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name         VARCHAR(255) NOT NULL DEFAULT '',
    avatar_url           TEXT,
    locale               VARCHAR(10) NOT NULL DEFAULT 'tr',
    timezone             VARCHAR(64) NOT NULL DEFAULT 'Europe/Istanbul',
    onboarding_complete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE IF EXISTS user_profiles;
