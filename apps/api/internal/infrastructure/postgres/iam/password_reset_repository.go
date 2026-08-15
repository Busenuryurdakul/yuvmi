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

type PasswordResetRepo struct{ db *pgxpool.Pool }

func NewPasswordResetRepo(db *pgxpool.Pool) *PasswordResetRepo { return &PasswordResetRepo{db: db} }

func (r *PasswordResetRepo) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = NOW()
		WHERE user_id = $1 AND used_at IS NULL`, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to invalidate old reset tokens", err)
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
		VALUES ($1, $2, $3, $4, NOW())`,
		uuid.New(), userID, tokenHash, expiresAt)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to store reset token", err)
	}
	return nil
}

func (r *PasswordResetRepo) Consume(ctx context.Context, tokenHash string) (uuid.UUID, error) {
	var userID uuid.UUID
	err := r.db.QueryRow(ctx, `
		SELECT user_id FROM password_reset_tokens
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
		tokenHash).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return uuid.Nil, domainErr.New(domainErr.ErrBadRequest, "invalid or expired reset token", nil)
		}
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "failed to lookup reset token", err)
	}

	_, err = r.db.Exec(ctx, `
		UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`, tokenHash)
	if err != nil {
		return uuid.Nil, domainErr.New(domainErr.ErrInternal, "failed to consume reset token", err)
	}
	return userID, nil
}
