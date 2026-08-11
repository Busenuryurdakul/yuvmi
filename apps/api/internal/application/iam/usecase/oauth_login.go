package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// OAuthLoginUseCase handles Google/Apple OAuth sign-in.
type OAuthLoginUseCase struct {
	userRepo repository.UserRepository
	verifier *infraAuth.OAuthVerifier
	issuer   *TokenIssuer
}

func NewOAuthLoginUseCase(
	userRepo repository.UserRepository,
	verifier *infraAuth.OAuthVerifier,
	issuer *TokenIssuer,
) *OAuthLoginUseCase {
	return &OAuthLoginUseCase{userRepo: userRepo, verifier: verifier, issuer: issuer}
}

func (uc *OAuthLoginUseCase) Execute(ctx context.Context, req dto.OAuthRequest) (*dto.AuthTokenResponse, error) {
	provider := strings.ToLower(req.Provider)

	var claims *infraAuth.OAuthClaims
	var err error
	switch provider {
	case "google":
		claims, err = uc.verifier.VerifyGoogleIDToken(ctx, req.IDToken)
	case "apple":
		claims, err = uc.verifier.VerifyAppleIdentityToken(ctx, req.IDToken)
	default:
		return nil, domainErr.New(domainErr.ErrBadRequest, "unsupported OAuth provider", nil)
	}
	if err != nil {
		return nil, err
	}

	user, err := uc.userRepo.GetByProvider(ctx, provider, claims.Subject)
	if err != nil {
		if !errors.Is(err, domainErr.ErrNotFound) {
			return nil, err
		}
		user = uc.findOrCreateUser(ctx, provider, claims, req)
		if user == nil {
			return nil, domainErr.New(domainErr.ErrInternal, "failed to create OAuth user", nil)
		}
	}

	if !user.IsActive() {
		return nil, domainErr.New(domainErr.ErrForbidden, "account is not active", nil)
	}

	return uc.issuer.Issue(ctx, user)
}

func (uc *OAuthLoginUseCase) findOrCreateUser(ctx context.Context, provider string, claims *infraAuth.OAuthClaims, req dto.OAuthRequest) *model.User {
	if claims.Email != "" {
		if existing, err := uc.userRepo.GetByEmail(ctx, claims.Email); err == nil && existing != nil {
			existing.AuthProvider = provider
			existing.ProviderSubject = claims.Subject
			if existing.PasswordHash == "" {
				_ = uc.userRepo.Update(ctx, existing)
			}
			return existing
		}
	}

	firstName := req.FirstName
	if firstName == "" {
		firstName = claims.FirstName
	}
	lastName := req.LastName
	if lastName == "" {
		lastName = claims.LastName
	}
	email := claims.Email
	if email == "" {
		email = provider + "-" + claims.Subject + "@oauth.yuvmi.app"
	}

	user := &model.User{
		Email:           email,
		FirstName:       firstName,
		LastName:        lastName,
		AuthProvider:    provider,
		ProviderSubject: claims.Subject,
		Status:          model.UserStatusActive,
	}
	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil
	}
	return user
}
