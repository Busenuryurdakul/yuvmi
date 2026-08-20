-- +goose Up

-- ai_jobs is deliberately amnesiac: it stores a hash of the prompt so the table
-- can be read during debugging without exposing what a user wrote. That makes
-- it useless as a training corpus, which is the point — accounting and training
-- data are different purposes and must not share a table.
--
-- ai_training_samples is the opposite trade, made explicitly and only with the
-- user's permission: the real prompt, the real model output, and what the user
-- did with it. A row exists only while the ai_training_data consent is granted;
-- revoking deletes the user's rows (see ConsentRepository callers), so this
-- table never outlives the permission that created it.
CREATE TABLE IF NOT EXISTS ai_training_samples (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- One sample per generation. CASCADE rather than SET NULL: a sample whose
    -- job is gone has lost its accounting context and is not worth keeping.
    job_id         UUID NOT NULL UNIQUE REFERENCES ai_jobs(id) ON DELETE CASCADE,

    -- Denormalised from ai_jobs so account deletion reaches this table directly
    -- rather than depending on the job cascade firing first.
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    scope          VARCHAR(64) NOT NULL,
    provider       VARCHAR(50),
    model          VARCHAR(100),

    -- The prompt context as it was actually sent, not a hash. This is the
    -- column that makes fine-tuning possible and the column the consent gate
    -- exists to protect.
    prompt_context TEXT NOT NULL,
    output         JSONB NOT NULL,

    -- What the user did with the suggestion. 'pending' until the client
    -- reports back; a sample that stays pending is still useful (it records
    -- what the model produced) but is excluded from preference training.
    decision       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (decision IN ('pending', 'accepted', 'edited', 'rejected')),

    -- Present only for 'edited': the version the user kept. The gap between
    -- output and final_output is the highest-value signal in this table.
    final_output   JSONB,
    decided_at     TIMESTAMPTZ,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Serves the eventual export: "give me every decided sample in this scope,
-- oldest first".
CREATE INDEX idx_ai_training_samples_scope_decision
    ON ai_training_samples(scope, decision, created_at);

CREATE INDEX idx_ai_training_samples_user ON ai_training_samples(user_id);

-- +goose Down
DROP TABLE IF EXISTS ai_training_samples;
