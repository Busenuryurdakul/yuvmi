package usecase

import (
	"context"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// LoginUseCase handles user authentication.
type LoginUseCase struct {
	userRepo repository.UserRepository
	auth     service.AuthService
	issuer   *TokenIssuer
	yuvmiCfg config.YuvmiConfig
}

// NewLoginUseCase creates a new LoginUseCase.
func NewLoginUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	issuer *TokenIssuer,
	yuvmiCfg config.YuvmiConfig,
) *LoginUseCase {
	return &LoginUseCase{userRepo: userRepo, auth: auth, issuer: issuer, yuvmiCfg: yuvmiCfg}
}

// Execute authenticates a user and returns JWT tokens.
func (uc *LoginUseCase) Execute(ctx context.Context, req dto.LoginRequest) (*dto.AuthTokenResponse, error) {
	if IsDevPasswordBlocked(uc.yuvmiCfg, req.Password) {
		return nil, domainErr.New(domainErr.ErrForbidden, "dev auth bridge is disabled", nil)
	}

	user, err := uc.userRepo.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid credentials", nil)
	}

	if !user.IsActive() {
		return nil, domainErr.New(domainErr.ErrForbidden, "account is not active", nil)
	}

	if user.PasswordHash == "" {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "use OAuth to sign in", nil)
	}

	if err := uc.auth.VerifyPassword(user.PasswordHash, req.Password); err != nil {
		return nil, err
	}

	return uc.issuer.Issue(ctx, user)
}
