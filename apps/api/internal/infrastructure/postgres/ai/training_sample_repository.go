package ai

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type TrainingSampleRepo struct {
	db *pgxpool.Pool
}

func NewTrainingSampleRepo(db *pgxpool.Pool) *TrainingSampleRepo {
	return &TrainingSampleRepo{db: db}
}

// Create writes one generation into the corpus.
//
// ON CONFLICT DO NOTHING guards the job_id unique index: a retried write must
// not overwrite the original sample, because the first output is the one the
// user actually saw and reacted to.
func (r *TrainingSampleRepo) Create(ctx context.Context, sample *model.TrainingSample) error {
	if sample.ID == uuid.Nil {
		sample.ID = uuid.New()
	}
	sample.CreatedAt = time.Now().UTC()
	if sample.Decision == "" {
		sample.Decision = model.DecisionPending
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO ai_training_samples
			(id, job_id, user_id, scope, provider, model, prompt_context, output, decision, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (job_id) DO NOTHING`,
		sample.ID, sample.JobID, sample.UserID, string(sample.Scope), sample.Provider,
		sample.Model, sample.PromptContext, []byte(sample.Output), string(sample.Decision),
		sample.CreatedAt)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to create ai training sample", err)
	}
	return nil
}

// RecordDecision labels a sample, matching on user_id as well as job_id so a
// caller cannot label — or probe for the existence of — someone else's row.
//
// The decision is written once. A user who accepts a suggestion and later
// changes their mind is doing something the app records elsewhere; rewriting
// the label here would corrupt the pair, because the output being judged is
// the one they reacted to at the time.
func (r *TrainingSampleRepo) RecordDecision(
	ctx context.Context,
	userID, jobID uuid.UUID,
	decision model.Decision,
	finalOutput []byte,
) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE ai_training_samples
		SET decision=$3, final_output=$4, decided_at=NOW()
		WHERE job_id=$1 AND user_id=$2 AND decision='pending'`,
		jobID, userID, string(decision), finalOutput)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to record ai training decision", err)
	}
	if tag.RowsAffected() == 0 {
		return errors.New(errors.ErrNotFound, "no pending training sample for this job", nil)
	}
	return nil
}

func (r *TrainingSampleRepo) DeleteByUser(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM ai_training_samples WHERE user_id=$1`, userID)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to delete ai training samples", err)
	}
	return nil
}
