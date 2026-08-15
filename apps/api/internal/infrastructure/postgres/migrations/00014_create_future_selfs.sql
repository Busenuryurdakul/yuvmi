-- +goose Up
CREATE TABLE IF NOT EXISTS future_selfs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(255) NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    domains      TEXT[] NOT NULL DEFAULT '{}',
    affirmations TEXT[] NOT NULL DEFAULT '{}',
    status       VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_future_selfs_user_active ON future_selfs(user_id) WHERE status IN ('draft', 'approved');

CREATE TABLE IF NOT EXISTS vision_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    future_self_id  UUID NOT NULL REFERENCES future_selfs(id) ON DELETE CASCADE,
    domain          VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    image_url       TEXT,
    note            TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vision_items_future_self ON vision_items(future_self_id);

-- +goose Down
DROP TABLE IF EXISTS vision_items;
DROP TABLE IF EXISTS future_selfs;
