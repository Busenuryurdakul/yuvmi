package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
)

type ConsentRepository interface {
	// ListByUser returns every stored consent row for the user. Scopes the user
	// has never decided on are absent; the usecase fills them in as denied.
	ListByUser(ctx context.Context, userID uuid.UUID) ([]model.Consent, error)

	// Get returns a single scope's consent, or ErrNotFound when the user has
	// never been asked.
	Get(ctx context.Context, userID uuid.UUID, scope model.ConsentScope) (*model.Consent, error)

	// Set grants or revokes a scope, stamping granted_at/revoked_at so the
	// decision history survives a later flip.
	Set(ctx context.Context, userID uuid.UUID, scope model.ConsentScope, granted bool) (*model.Consent, error)
}

type JobRepository interface {
	Create(ctx context.Context, job *model.Job) error

	// Complete records a successful run's accounting in one write.
	Complete(ctx context.Context, jobID uuid.UUID, tokens, latencyMs int, provider string) error

	// Fail records a terminal error code without storing provider output.
	Fail(ctx context.Context, jobID uuid.UUID, errorCode string, latencyMs int) error

	GetByID(ctx context.Context, userID, jobID uuid.UUID) (*model.Job, error)

	// CountSince counts a user's jobs in a scope since a cutoff, backing the
	// per-day quota. Cancelled jobs still count: they consumed provider budget.
	CountSince(ctx context.Context, userID uuid.UUID, scope model.ConsentScope, since time.Time) (int, error)

	// CancelPending marks a user's unfinished jobs in a scope as cancelled.
	// Called when consent is revoked mid-flight (PRD-AI 04, rule 6).
	CancelPending(ctx context.Context, userID uuid.UUID, scope model.ConsentScope) error
}

// TrainingSampleRepository stores the corpus behind the ai_training_data scope.
//
// Every method is scoped to a user id, including the ones that take a job id.
// That is not defensive habit: this table holds the raw prompts, so a lookup
// that could be satisfied by guessing a job id would be the one place in the AI
// stack where an identifier leak turns into a content leak.
type TrainingSampleRepository interface {
	// Create records a generation. Called best-effort after a successful run,
	// so a failure here must not fail the user's request.
	Create(ctx context.Context, sample *model.TrainingSample) error

	// RecordDecision labels an existing sample. Returns ErrNotFound when the
	// job has no sample — the ordinary case for a user who never granted the
	// training scope, and so not an error worth surfacing to them.
	RecordDecision(ctx context.Context, userID, jobID uuid.UUID, decision model.Decision, finalOutput []byte) error

	// DeleteByUser removes everything collected from one user. Called when the
	// training scope is revoked: consent withdrawn has to mean the corpus
	// forgets, not merely that it stops growing.
	DeleteByUser(ctx context.Context, userID uuid.UUID) error
}
