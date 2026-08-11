package profile

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
)

type CheckinRepo struct{ db *pgxpool.Pool }

func NewCheckinRepo(db *pgxpool.Pool) *CheckinRepo { return &CheckinRepo{db: db} }

func (r *CheckinRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.TodayEntry, error) {
	var e model.TodayEntry
	var domainScoresJSON []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, date, mood, energy, gratitude, reflection, domain_scores, created_at, updated_at
		FROM today_entries WHERE user_id=$1 AND date=$2`, userID, date,
	).Scan(&e.ID, &e.UserID, &e.Date, &e.Mood, &e.Energy, &e.Gratitude, &e.Reflection, &domainScoresJSON, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "check-in not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get check-in", err)
	}
	_ = json.Unmarshal(domainScoresJSON, &e.DomainScores)
	return &e, nil
}

func (r *CheckinRepo) Upsert(ctx context.Context, entry *model.TodayEntry) error {
	if entry.ID == uuid.Nil {
		entry.ID = uuid.New()
	}
	now := time.Now().UTC()
	entry.UpdatedAt = now
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = now
	}
	domainScoresJSON, _ := json.Marshal(entry.DomainScores)

	_, err := r.db.Exec(ctx, `
		INSERT INTO today_entries (id, user_id, date, mood, energy, gratitude, reflection, domain_scores, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT (user_id, date) DO UPDATE SET
			mood=EXCLUDED.mood, energy=EXCLUDED.energy, gratitude=EXCLUDED.gratitude,
			reflection=EXCLUDED.reflection, domain_scores=EXCLUDED.domain_scores, updated_at=EXCLUDED.updated_at`,
		entry.ID, entry.UserID, entry.Date, entry.Mood, entry.Energy, entry.Gratitude, entry.Reflection, domainScoresJSON, entry.CreatedAt, entry.UpdatedAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to upsert check-in", err)
	}
	return nil
}

func (r *CheckinRepo) ListSince(ctx context.Context, userID uuid.UUID, since time.Time) ([]*model.TodayEntry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, date, mood, energy, gratitude, reflection, domain_scores, created_at, updated_at
		FROM today_entries WHERE user_id=$1 AND date >= $2 ORDER BY date DESC`, userID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*model.TodayEntry
	for rows.Next() {
		var e model.TodayEntry
		var domainScoresJSON []byte
		if err := rows.Scan(&e.ID, &e.UserID, &e.Date, &e.Mood, &e.Energy, &e.Gratitude, &e.Reflection, &domainScoresJSON, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(domainScoresJSON, &e.DomainScores)
		entries = append(entries, &e)
	}
	return entries, nil
}

type AlignmentRepo struct{ db *pgxpool.Pool }

func NewAlignmentRepo(db *pgxpool.Pool) *AlignmentRepo { return &AlignmentRepo{db: db} }

func (r *AlignmentRepo) GetByDate(ctx context.Context, userID uuid.UUID, date time.Time) (*model.AlignmentSnapshot, error) {
	var s model.AlignmentSnapshot
	var factorsJSON []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, date, overall_score, factors, summary_explanation, goal_id, plan_id, created_at
		FROM alignment_snapshots WHERE user_id=$1 AND date=$2`, userID, date,
	).Scan(&s.ID, &s.UserID, &s.Date, &s.OverallScore, &factorsJSON, &s.SummaryExplanation, &s.GoalID, &s.PlanID, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainErr.New(domainErr.ErrNotFound, "alignment not found", nil)
		}
		return nil, domainErr.New(domainErr.ErrInternal, "failed to get alignment", err)
	}
	_ = json.Unmarshal(factorsJSON, &s.Factors)
	return &s, nil
}

func (r *AlignmentRepo) Upsert(ctx context.Context, snapshot *model.AlignmentSnapshot) error {
	if snapshot.ID == uuid.Nil {
		snapshot.ID = uuid.New()
	}
	if snapshot.CreatedAt.IsZero() {
		snapshot.CreatedAt = time.Now().UTC()
	}
	factorsJSON, _ := json.Marshal(snapshot.Factors)
	_, err := r.db.Exec(ctx, `
		INSERT INTO alignment_snapshots (id, user_id, date, overall_score, factors, summary_explanation, goal_id, plan_id, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		ON CONFLICT (user_id, date) DO UPDATE SET
			overall_score=EXCLUDED.overall_score, factors=EXCLUDED.factors,
			summary_explanation=EXCLUDED.summary_explanation, goal_id=EXCLUDED.goal_id, plan_id=EXCLUDED.plan_id`,
		snapshot.ID, snapshot.UserID, snapshot.Date, snapshot.OverallScore, factorsJSON, snapshot.SummaryExplanation, snapshot.GoalID, snapshot.PlanID, snapshot.CreatedAt)
	return err
}

func (r *AlignmentRepo) ListHistory(ctx context.Context, userID uuid.UUID, limit int) ([]*model.AlignmentSnapshot, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, date, overall_score, factors, summary_explanation, goal_id, plan_id, created_at
		FROM alignment_snapshots WHERE user_id=$1 ORDER BY date DESC LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*model.AlignmentSnapshot
	for rows.Next() {
		var s model.AlignmentSnapshot
		var factorsJSON []byte
		if err := rows.Scan(&s.ID, &s.UserID, &s.Date, &s.OverallScore, &factorsJSON, &s.SummaryExplanation, &s.GoalID, &s.PlanID, &s.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(factorsJSON, &s.Factors)
		out = append(out, &s)
	}
	return out, nil
}
