package profile

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/domain/profile/model"
)

type ProfileRepo struct {
	db *pgxpool.Pool
}

func NewProfileRepo(db *pgxpool.Pool) *ProfileRepo {
	return &ProfileRepo{db: db}
}

func (r *ProfileRepo) GetByUserID(ctx context.Context, userID uuid.UUID) (*model.UserProfile, error) {
	var p model.UserProfile
	err := r.db.QueryRow(ctx, `
		SELECT user_id, display_name, avatar_url, locale, timezone, onboarding_complete, created_at, updated_at
		FROM user_profiles WHERE user_id = $1`, userID,
	).Scan(&p.UserID, &p.DisplayName, &p.AvatarURL, &p.Locale, &p.Timezone, &p.OnboardingComplete, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, errors.New(errors.ErrNotFound, "profile not found", nil)
	}
	return &p, nil
}

func (r *ProfileRepo) Upsert(ctx context.Context, profile *model.UserProfile) error {
	now := time.Now().UTC()
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_profiles (user_id, display_name, avatar_url, locale, timezone, onboarding_complete, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			avatar_url = EXCLUDED.avatar_url,
			locale = EXCLUDED.locale,
			timezone = EXCLUDED.timezone,
			onboarding_complete = EXCLUDED.onboarding_complete,
			updated_at = EXCLUDED.updated_at`,
		profile.UserID, profile.DisplayName, profile.AvatarURL, profile.Locale, profile.Timezone,
		profile.OnboardingComplete, now, now,
	)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to upsert profile", err)
	}
	return nil
}

func (r *ProfileRepo) SetOnboardingComplete(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_profiles SET onboarding_complete = TRUE, updated_at = NOW() WHERE user_id = $1`, userID)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to complete onboarding", err)
	}
	return nil
}

func (r *ProfileRepo) EnsureDefault(ctx context.Context, userID uuid.UUID, displayName string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_profiles (user_id, display_name)
		VALUES ($1, $2)
		ON CONFLICT (user_id) DO NOTHING`, userID, displayName)
	if err != nil {
		return errors.New(errors.ErrInternal, "failed to create default profile", err)
	}
	return nil
}
