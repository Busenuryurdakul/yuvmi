-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50),
    ADD COLUMN IF NOT EXISTS provider_subject VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider_subject
    ON users (auth_provider, provider_subject)
    WHERE auth_provider IS NOT NULL AND provider_subject IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_oauth_provider_subject;
ALTER TABLE users
    DROP COLUMN IF EXISTS provider_subject,
    DROP COLUMN IF EXISTS auth_provider;
