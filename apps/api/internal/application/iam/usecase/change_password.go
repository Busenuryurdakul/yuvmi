package usecase

import (
	"context"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/port"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// ChangePasswordUseCase updates the authenticated user's password and revokes all refresh tokens.
type ChangePasswordUseCase struct {
	userRepo            repository.UserRepository
	auth                service.AuthService
	passwordChangeStore port.PasswordChangeStore
	yuvmiCfg            config.YuvmiConfig
}

// NewChangePasswordUseCase creates a ChangePasswordUseCase.
func NewChangePasswordUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	passwordChangeStore port.PasswordChangeStore,
	yuvmiCfg config.YuvmiConfig,
) *ChangePasswordUseCase {
	return &ChangePasswordUseCase{
		userRepo:            userRepo,
		auth:                auth,
		passwordChangeStore: passwordChangeStore,
		yuvmiCfg:            yuvmiCfg,
	}
}

// Execute validates the current password and atomically updates the hash plus refresh-token revocations.
func (uc *ChangePasswordUseCase) Execute(ctx context.Context, userID uuid.UUID, req dto.ChangePasswordRequest) error {
	if IsDevPasswordBlocked(uc.yuvmiCfg, req.NewPassword) {
		return domainErr.New(domainErr.ErrForbidden, "dev auth bridge is disabled", nil)
	}

	if req.CurrentPassword == req.NewPassword {
		return domainErr.New(domainErr.ErrBadRequest, "new password must differ from current password", nil)
	}

	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	if user.PasswordHash == "" {
		return domainErr.New(domainErr.ErrBadRequest, "password login is not enabled for this account", nil)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		return domainErr.New(domainErr.ErrBadRequest, "current password is incorrect", nil)
	}

	hash, err := uc.auth.HashPassword(req.NewPassword)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to hash password", err)
	}

	return uc.passwordChangeStore.ChangePasswordAndRevokeSessions(ctx, userID, hash)
}
