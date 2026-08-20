-- +goose Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts were created before verification existed; do not lock them out.
UPDATE users SET email_verified = true WHERE email_verified = false;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
    ON email_verification_tokens(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_email_verification_tokens_user_id;
DROP TABLE IF EXISTS email_verification_tokens;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
