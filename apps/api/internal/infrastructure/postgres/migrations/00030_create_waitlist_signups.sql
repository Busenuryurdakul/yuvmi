-- +goose Up
CREATE TABLE IF NOT EXISTS waitlist_signups (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_normalized        VARCHAR(320) NOT NULL,
    locale                  VARCHAR(10)  NOT NULL DEFAULT 'tr',
    source                  VARCHAR(50)  NOT NULL DEFAULT 'web_landing',
    consent_at              TIMESTAMPTZ  NOT NULL,
    privacy_policy_version  VARCHAR(64)  NOT NULL,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_waitlist_signups_email_normalized UNIQUE (email_normalized)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups (created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS waitlist_signups;
