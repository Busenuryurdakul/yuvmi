package waitlist

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
	waitlistRepo "github.com/masterfabric-go/masterfabric/internal/domain/waitlist/repository"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// SignupRepo implements SignupRepository with PostgreSQL.
type SignupRepo struct {
	db *pgxpool.Pool
}

// NewSignupRepo creates a new waitlist signup repository.
func NewSignupRepo(db *pgxpool.Pool) *SignupRepo {
	return &SignupRepo{db: db}
}

// Register inserts a waitlist signup or no-ops on duplicate normalized email.
func (r *SignupRepo) Register(ctx context.Context, signup *model.Signup) (waitlistRepo.RegisterResult, error) {
	if signup.ID == uuid.Nil {
		signup.ID = uuid.New()
	}

	now := time.Now().UTC()
	if signup.CreatedAt.IsZero() {
		signup.CreatedAt = now
	}
	if signup.ConsentAt.IsZero() {
		signup.ConsentAt = now
	}

	var insertedID uuid.UUID
	err := r.db.QueryRow(ctx, `
		INSERT INTO waitlist_signups (
			id, email_normalized, source, locale, consent_at, privacy_policy_version, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (email_normalized) DO NOTHING
		RETURNING id`,
		signup.ID,
		signup.EmailNormalized,
		signup.Source,
		signup.Locale,
		signup.ConsentAt,
		signup.PrivacyPolicyVersion,
		signup.CreatedAt,
	).Scan(&insertedID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return waitlistRepo.RegisterResult{Created: false}, nil
		}
		return waitlistRepo.RegisterResult{}, domainErr.New(domainErr.ErrInternal, "failed to register waitlist signup", err)
	}

	return waitlistRepo.RegisterResult{Created: true}, nil
}
