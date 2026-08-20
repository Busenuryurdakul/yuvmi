package usecase

import (
	"context"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
)

// TokenIssuer issues access + refresh token pairs.
type TokenIssuer struct {
	auth          service.AuthService
	refreshExpiry time.Duration
	refreshRepo   *pgIam.RefreshTokenRepo
}

func NewTokenIssuer(auth service.AuthService, refreshExpiry time.Duration, refreshRepo *pgIam.RefreshTokenRepo) *TokenIssuer {
	return &TokenIssuer{auth: auth, refreshExpiry: refreshExpiry, refreshRepo: refreshRepo}
}

func (t *TokenIssuer) Issue(ctx context.Context, user *model.User) (*dto.AuthTokenResponse, error) {
	access, err := t.auth.GenerateToken(ctx, service.TokenClaims{
		UserID: user.ID,
		Email:  user.Email,
	})
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to generate token", err)
	}

	refresh, err := t.auth.GenerateRefreshToken()
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to generate refresh token", err)
	}

	expiresAt := time.Now().UTC().Add(t.refreshExpiry)
	if err := t.refreshRepo.Create(ctx, user.ID, t.auth.HashRefreshToken(refresh), expiresAt); err != nil {
		return nil, err
	}

	return &dto.AuthTokenResponse{
		Token:        access,
		RefreshToken: refresh,
		User: dto.UserInfo{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Status:    string(user.Status),
			CreatedAt: user.CreatedAt,
		},
	}, nil
}
