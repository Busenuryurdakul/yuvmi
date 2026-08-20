package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
)

// DeleteAccountUseCase permanently removes a user account (GDPR/KVKK).
type DeleteAccountUseCase struct {
	userRepo    repository.UserRepository
	auth        service.AuthService
	refreshRepo *pgIam.RefreshTokenRepo
}

func NewDeleteAccountUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	refreshRepo *pgIam.RefreshTokenRepo,
) *DeleteAccountUseCase {
	return &DeleteAccountUseCase{userRepo: userRepo, auth: auth, refreshRepo: refreshRepo}
}

func (uc *DeleteAccountUseCase) Execute(ctx context.Context, userID uuid.UUID, req dto.DeleteAccountRequest) error {
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.PasswordHash != "" {
		if req.Password == "" {
			return domainErr.New(domainErr.ErrBadRequest, "password required to delete account", nil)
		}
		if err := uc.auth.VerifyPassword(user.PasswordHash, req.Password); err != nil {
			return domainErr.New(domainErr.ErrUnauthorized, "invalid password", nil)
		}
	}

	_ = uc.refreshRepo.RevokeAllForUser(ctx, userID)
	return uc.userRepo.Delete(ctx, userID)
}
