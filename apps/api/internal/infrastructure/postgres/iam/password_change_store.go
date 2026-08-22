package iam

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// PasswordChangeStore implements port.PasswordChangeStore with a single PostgreSQL transaction.
type PasswordChangeStore struct {
	db *pgxpool.Pool
}

// NewPasswordChangeStore creates a PasswordChangeStore.
func NewPasswordChangeStore(db *pgxpool.Pool) *PasswordChangeStore {
	return &PasswordChangeStore{db: db}
}

// ChangePasswordAndRevokeSessions updates password_hash and revokes all active refresh tokens atomically.
func (s *PasswordChangeStore) ChangePasswordAndRevokeSessions(ctx context.Context, userID uuid.UUID, passwordHash string) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to begin transaction", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		UPDATE users SET password_hash = $1, updated_at = NOW()
		WHERE id = $2`, passwordHash, userID)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to update user password", err)
	}
	if tag.RowsAffected() != 1 {
		return domainErr.New(domainErr.ErrInternal, "failed to update user password", nil)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE refresh_tokens SET revoked_at = NOW()
		WHERE user_id = $1 AND revoked_at IS NULL`, userID); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to revoke refresh tokens", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to commit password change", err)
	}
	return nil
}
