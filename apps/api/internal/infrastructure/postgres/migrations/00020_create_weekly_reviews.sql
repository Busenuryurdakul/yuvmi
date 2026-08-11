-- +goose Up
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id           UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    week_start_date   DATE NOT NULL,
    summary           TEXT NOT NULL DEFAULT '',
    adaptations       JSONB NOT NULL DEFAULT '[]',
    metrics           JSONB NOT NULL DEFAULT '{}',
    reflection        TEXT NOT NULL DEFAULT '',
    next_plan_version INT,
    status            VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, week_start_date)
);

CREATE INDEX idx_weekly_reviews_user ON weekly_reviews(user_id, week_start_date DESC);

-- +goose Down
DROP TABLE IF EXISTS weekly_reviews;
