package ai

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/ai/model"
	"github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type JobRepo struct {
	db *pgxpool.Pool
}

func NewJobRepo(db *pgxpool.Pool) *JobRepo {
	return &JobRepo{db: db}
}

func (r *JobRepo) Create(ctx context.Context, job *model.Job) error {
	if job.ID == uuid.Nil {
		job.ID = uuid.New()
	}
	job.CreatedAt = time.Now().UTC()
	_, err := r.db.Exec(ctx, `
		INSERT INTO ai_jobs (id, user_id, scope, status, input_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		job.ID, job.UserID, string(job.Scope), string(job.Status), job.InputHash, job.CreatedAt)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to create ai job", err)
	}
	return nil
}

// Complete is guarded on status so a job cancelled by a consent revocation
// mid-flight is not resurrected by a provider response that arrives afterwards.
func (r *JobRepo) Complete(ctx context.Context, jobID uuid.UUID, tokens, latencyMs int, provider string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE ai_jobs
		SET status='completed', tokens_used=$2, latency_ms=$3, provider=$4, completed_at=NOW()
		WHERE id=$1 AND status IN ('queued','running')`,
		jobID, tokens, latencyMs, provider)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to complete ai job", err)
	}
	return nil
}

func (r *JobRepo) Fail(ctx context.Context, jobID uuid.UUID, errorCode string, latencyMs int) error {
	_, err := r.db.Exec(ctx, `
		UPDATE ai_jobs
		SET status='failed', error_code=$2, latency_ms=$3, completed_at=NOW()
		WHERE id=$1 AND status IN ('queued','running')`,
		jobID, errorCode, latencyMs)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to fail ai job", err)
	}
	return nil
}

func (r *JobRepo) GetByID(ctx context.Context, userID, jobID uuid.UUID) (*model.Job, error) {
	var job model.Job
	var scope, status string
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, scope, status, input_hash, output_resource_type, output_resource_id,
		       error_code, tokens_used, latency_ms, provider, created_at, completed_at
		FROM ai_jobs WHERE id=$1 AND user_id=$2`, jobID, userID,
	).Scan(&job.ID, &job.UserID, &scope, &status, &job.InputHash, &job.OutputResourceType,
		&job.OutputResourceID, &job.ErrorCode, &job.TokensUsed, &job.LatencyMs, &job.Provider,
		&job.CreatedAt, &job.CompletedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New(errors.ErrNotFound, "ai job not found", nil)
		}
		return nil, errors.New(errors.ErrInternal, "failed to get ai job", err)
	}
	job.Scope = model.ConsentScope(scope)
	job.Status = model.JobStatus(status)
	return &job, nil
}

func (r *JobRepo) CountSince(ctx context.Context, userID uuid.UUID, scope model.ConsentScope, since time.Time) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM ai_jobs
		WHERE user_id=$1 AND scope=$2 AND created_at >= $3`,
		userID, string(scope), since).Scan(&count)
	if err != nil {
		return 0, errors.New(errors.ErrInternal, "failed to count ai jobs", err)
	}
	return count, nil
}

func (r *JobRepo) CancelPending(ctx context.Context, userID uuid.UUID, scope model.ConsentScope) error {
	_, err := r.db.Exec(ctx, `
		UPDATE ai_jobs SET status='cancelled', completed_at=NOW()
		WHERE user_id=$1 AND scope=$2 AND status IN ('queued','running')`,
		userID, string(scope))
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to cancel pending ai jobs", err)
	}
	return nil
}
