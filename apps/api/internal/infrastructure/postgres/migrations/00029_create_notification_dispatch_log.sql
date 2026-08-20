-- +goose Up
CREATE TABLE IF NOT EXISTS notification_dispatch_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        VARCHAR(50) NOT NULL,
    dispatch_date DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, kind, dispatch_date)
);

CREATE INDEX idx_notification_dispatch_log_dispatch_date ON notification_dispatch_log(dispatch_date);

-- +goose Down
DROP TABLE IF EXISTS notification_dispatch_log;
