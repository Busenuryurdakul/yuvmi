package goal

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/goal/model"
)

type WeeklyReviewRepo struct{ db *pgxpool.Pool }

func NewWeeklyReviewRepo(db *pgxpool.Pool) *WeeklyReviewRepo { return &WeeklyReviewRepo{db: db} }

func (r *WeeklyReviewRepo) GetByWeek(ctx context.Context, userID uuid.UUID, weekStart time.Time) (*model.WeeklyReview, error) {
	return r.scanReview(r.db.QueryRow(ctx, `
		SELECT id, user_id, plan_id, week_start_date, summary, adaptations, metrics, reflection,
		       next_plan_version, status, created_at, updated_at
		FROM weekly_reviews WHERE user_id=$1 AND week_start_date=$2`, userID, weekStart))
}

func (r *WeeklyReviewRepo) List(ctx context.Context, userID uuid.UUID, limit int) ([]*model.WeeklyReview, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, plan_id, week_start_date, summary, adaptations, metrics, reflection,
		       next_plan_version, status, created_at, updated_at
		FROM weekly_reviews WHERE user_id=$1 ORDER BY week_start_date DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*model.WeeklyReview
	for rows.Next() {
		wr, err := r.scanReview(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, wr)
	}
	if err := rows.Err(); err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to list weekly reviews", err)
	}
	return out, nil
}

func (r *WeeklyReviewRepo) Create(ctx context.Context, review *model.WeeklyReview) error {
	if review.ID == uuid.Nil {
		review.ID = uuid.New()
	}
	now := time.Now().UTC()
	review.CreatedAt = now
	review.UpdatedAt = now
	adaptationsJSON, _ := json.Marshal(review.Adaptations)
	metricsJSON, _ := json.Marshal(review.Metrics)

	_, err := r.db.Exec(ctx, `
		INSERT INTO weekly_reviews (id, user_id, plan_id, week_start_date, summary, adaptations, metrics,
			reflection, next_plan_version, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
		review.ID, review.UserID, review.PlanID, review.WeekStartDate, review.Summary,
		adaptationsJSON, metricsJSON, review.Reflection, review.NextPlanVersion, review.Status,
		review.CreatedAt, review.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to create weekly review", err)
	}
	return nil
}

func (r *WeeklyReviewRepo) Update(ctx context.Context, review *model.WeeklyReview) error {
	review.UpdatedAt = time.Now().UTC()
	adaptationsJSON, _ := json.Marshal(review.Adaptations)
	metricsJSON, _ := json.Marshal(review.Metrics)

	tag, err := r.db.Exec(ctx, `
		UPDATE weekly_reviews SET summary=$3, adaptations=$4, metrics=$5, reflection=$6,
			next_plan_version=$7, status=$8, updated_at=$9
		WHERE id=$1 AND user_id=$2`,
		review.ID, review.UserID, review.Summary, adaptationsJSON, metricsJSON, review.Reflection,
		review.NextPlanVersion, review.Status, review.UpdatedAt)
	if err != nil || tag.RowsAffected() == 0 {
		return domainErr.New(domainErr.ErrNotFound, "weekly review not found", err)
	}
	return nil
}

func (r *WeeklyReviewRepo) scanReview(row pgx.Row) (*model.WeeklyReview, error) {
	var wr model.WeeklyReview
	var adaptationsJSON, metricsJSON []byte
	err := row.Scan(&wr.ID, &wr.UserID, &wr.PlanID, &wr.WeekStartDate, &wr.Summary,
		&adaptationsJSON, &metricsJSON, &wr.Reflection, &wr.NextPlanVersion, &wr.Status,
		&wr.CreatedAt, &wr.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "weekly review not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to scan weekly review", err)
	}
	_ = json.Unmarshal(adaptationsJSON, &wr.Adaptations)
	_ = json.Unmarshal(metricsJSON, &wr.Metrics)
	return &wr, nil
}
