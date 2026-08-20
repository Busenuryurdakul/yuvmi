package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
)

// ResetPasswordUseCase completes password reset with a token.
type ResetPasswordUseCase struct {
	userRepo  repository.UserRepository
	auth      service.AuthService
	resetRepo *pgIam.PasswordResetRepo
	refreshRepo *pgIam.RefreshTokenRepo
}

func NewResetPasswordUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	resetRepo *pgIam.PasswordResetRepo,
	refreshRepo *pgIam.RefreshTokenRepo,
) *ResetPasswordUseCase {
	return &ResetPasswordUseCase{userRepo: userRepo, auth: auth, resetRepo: resetRepo, refreshRepo: refreshRepo}
}

func (uc *ResetPasswordUseCase) Execute(ctx context.Context, req dto.ResetPasswordRequest) error {
	userID, err := uc.resetRepo.Consume(ctx, uc.auth.HashRefreshToken(req.Token))
	if err != nil {
		return err
	}

	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	hash, err := uc.auth.HashPassword(req.NewPassword)
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to hash password", err)
	}
	user.PasswordHash = hash
	user.EmailVerified = true
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return err
	}

	return uc.refreshRepo.RevokeAllForUser(ctx, userID)
}
