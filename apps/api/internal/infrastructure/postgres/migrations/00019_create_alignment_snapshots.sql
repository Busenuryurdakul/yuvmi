-- +goose Up
CREATE TABLE IF NOT EXISTS alignment_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    overall_score       SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    factors             JSONB NOT NULL DEFAULT '[]',
    summary_explanation TEXT NOT NULL DEFAULT '',
    goal_id             UUID REFERENCES goals(id) ON DELETE SET NULL,
    plan_id             UUID REFERENCES plans(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX idx_alignment_snapshots_user_date ON alignment_snapshots(user_id, date DESC);

-- +goose Down
DROP TABLE IF EXISTS alignment_snapshots;
