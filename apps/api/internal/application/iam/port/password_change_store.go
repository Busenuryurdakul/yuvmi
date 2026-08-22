package port

import (
	"context"

	"github.com/google/uuid"
)

// PasswordChangeStore atomically updates a user's password hash and revokes all refresh tokens.
type PasswordChangeStore interface {
	ChangePasswordAndRevokeSessions(ctx context.Context, userID uuid.UUID, passwordHash string) error
}
