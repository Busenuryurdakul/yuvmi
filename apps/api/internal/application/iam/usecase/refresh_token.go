package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
)

// RefreshTokenUseCase rotates refresh tokens and issues a new access token.
type RefreshTokenUseCase struct {
	userRepo    repository.UserRepository
	auth        service.AuthService
	refreshRepo *pgIam.RefreshTokenRepo
	issuer      *TokenIssuer
}

func NewRefreshTokenUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	refreshRepo *pgIam.RefreshTokenRepo,
	issuer *TokenIssuer,
) *RefreshTokenUseCase {
	return &RefreshTokenUseCase{userRepo: userRepo, auth: auth, refreshRepo: refreshRepo, issuer: issuer}
}

func (uc *RefreshTokenUseCase) Execute(ctx context.Context, req dto.RefreshRequest) (*dto.AuthTokenResponse, error) {
	hash := uc.auth.HashRefreshToken(req.RefreshToken)
	userID, err := uc.refreshRepo.GetValid(ctx, hash)
	if err != nil {
		return nil, err
	}

	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !user.IsActive() {
		return nil, domainErr.New(domainErr.ErrForbidden, "account is not active", nil)
	}

	_ = uc.refreshRepo.Revoke(ctx, hash)
	return uc.issuer.Issue(ctx, user)
}
