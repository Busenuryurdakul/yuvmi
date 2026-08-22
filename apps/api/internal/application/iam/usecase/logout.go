package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type logoutRefreshRepository interface {
	RevokeForUser(ctx context.Context, userID uuid.UUID, tokenHash string) error
}

// LogoutUseCase revokes a single refresh token for the authenticated user.
type LogoutUseCase struct {
	auth        service.AuthService
	refreshRepo logoutRefreshRepository
}

func NewLogoutUseCase(auth service.AuthService, refreshRepo logoutRefreshRepository) *LogoutUseCase {
	return &LogoutUseCase{auth: auth, refreshRepo: refreshRepo}
}

// Execute revokes the given refresh token when it belongs to userID.
// Returns nil for idempotent success (204), including unknown or other-user tokens.
func (uc *LogoutUseCase) Execute(ctx context.Context, userID uuid.UUID, req dto.LogoutRequest) error {
	if req.RefreshToken == "" {
		return domainErr.New(domainErr.ErrBadRequest, "refresh_token is required", nil)
	}

	hash := uc.auth.HashRefreshToken(req.RefreshToken)
	if err := uc.refreshRepo.RevokeForUser(ctx, userID, hash); err != nil {
		return err
	}

	return nil
}
