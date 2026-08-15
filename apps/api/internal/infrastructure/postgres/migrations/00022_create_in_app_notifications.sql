-- +goose Up
CREATE TABLE IF NOT EXISTS in_app_notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    body       TEXT NOT NULL DEFAULT '',
    type       VARCHAR(50) NOT NULL DEFAULT 'general',
    data       JSONB NOT NULL DEFAULT '{}',
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_in_app_notifications_user ON in_app_notifications(user_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS in_app_notifications;
