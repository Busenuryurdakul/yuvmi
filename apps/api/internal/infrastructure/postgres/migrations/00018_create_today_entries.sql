-- +goose Up
CREATE TABLE IF NOT EXISTS today_entries (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date          DATE NOT NULL,
    mood          SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
    energy        SMALLINT NOT NULL CHECK (energy BETWEEN 1 AND 5),
    gratitude     TEXT[] NOT NULL DEFAULT '{}',
    reflection    TEXT NOT NULL DEFAULT '',
    domain_scores JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_today_entries_user_date ON today_entries(user_id, date);

-- +goose Down
DROP TABLE IF EXISTS today_entries;
