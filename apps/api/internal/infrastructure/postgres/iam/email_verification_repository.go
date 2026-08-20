package iam

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type EmailVerificationRepo struct{ db *pgxpool.Pool }

func NewEmailVerificationRepo(db *pgxpool.Pool) *EmailVerificationRepo {
	return &EmailVerificationRepo{db: db}
}

func (r *EmailVerificationRepo) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		UPDATE email_verification_tokens SET used_at = NOW()
		WHERE user_id = $1 AND used_at IS NULL`, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to invalidate old verification tokens", err)
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, NOW())`,
		uuid.New(), userID, tokenHash, expiresAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to store verification token", err)
	}
	return nil
}

func (r *EmailVerificationRepo) Consume(ctx context.Context, tokenHash string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx, `
		SELECT user_id FROM email_verification_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, domainErr.New(domainErr.ErrBadRequest, "invalid or expired verification token", nil)
		}
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "failed to lookup verification token", err)
	}

	_, err = r.db.Exec(ctx, `
		UPDATE email_verification_tokens SET used_at = NOW() WHERE token_hash = $1`, tokenHash)
	if err != nil {
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "failed to consume verification token", err)
	}
	return userID, nil
}
