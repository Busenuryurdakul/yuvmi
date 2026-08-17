-- +goose Up
ALTER TABLE users ADD COLUMN pearl_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS pearl_awards (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason     VARCHAR(64) NOT NULL,
    amount     INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pearl_awards_user_reason_date ON pearl_awards(user_id, reason, created_at);

-- +goose Down
DROP TABLE IF EXISTS pearl_awards;
ALTER TABLE users DROP COLUMN pearl_balance;
