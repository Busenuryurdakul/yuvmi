package usecase

import (
	"context"
	"errors"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// OAuthLoginUseCase handles Google/Apple OAuth sign-in.
type OAuthLoginUseCase struct {
	userRepo    repository.UserRepository
	verifier    *infraAuth.OAuthVerifier
	issuer      *TokenIssuer
	refreshRepo *pgIam.RefreshTokenRepo
}

func NewOAuthLoginUseCase(
	userRepo repository.UserRepository,
	verifier *infraAuth.OAuthVerifier,
	issuer *TokenIssuer,
	refreshRepo *pgIam.RefreshTokenRepo,
) *OAuthLoginUseCase {
	return &OAuthLoginUseCase{userRepo: userRepo, verifier: verifier, issuer: issuer, refreshRepo: refreshRepo}
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
		user, err = uc.findOrCreateUser(ctx, provider, claims, req)
		if err != nil {
			return nil, err
		}
	}

	if !user.IsActive() {
		return nil, domainErr.New(domainErr.ErrForbidden, "account is not active", nil)
	}

	return uc.issuer.Issue(ctx, user)
}

func (uc *OAuthLoginUseCase) findOrCreateUser(ctx context.Context, provider string, claims *infraAuth.OAuthClaims, req dto.OAuthRequest) (*model.User, error) {
	if claims.Email != "" {
		claims.Email = strings.ToLower(strings.TrimSpace(claims.Email))
		if !claims.EmailVerified {
			return nil, domainErr.New(domainErr.ErrUnauthorized, "OAuth email is not verified", nil)
		}
		existing, err := uc.userRepo.GetByEmail(ctx, claims.Email)
		if err == nil && existing != nil {
			takeover, err := applyOAuthLink(existing, provider, claims)
			if err != nil {
				return nil, err
			}
			if err := uc.userRepo.Update(ctx, existing); err != nil {
				return nil, err
			}
			if takeover && uc.refreshRepo != nil {
				_ = uc.refreshRepo.RevokeAllForUser(ctx, existing.ID)
			}
			return existing, nil
		}
		if err != nil && !errors.Is(err, domainErr.ErrNotFound) {
			return nil, err
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
		EmailVerified:   claims.EmailVerified || claims.Email == "",
		Status:          model.UserStatusActive,
	}
	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

// applyOAuthLink attaches a verified OAuth identity to an existing email account.
// Unverified password accounts are taken over (password cleared) so a squatted
// email cannot keep access after the real owner proves it via Google/Apple.
func applyOAuthLink(existing *model.User, provider string, claims *infraAuth.OAuthClaims) (takeover bool, err error) {
	if claims == nil || !claims.EmailVerified {
		return false, domainErr.New(domainErr.ErrUnauthorized, "OAuth email is not verified", nil)
	}
	existing.AuthProvider = provider
	existing.ProviderSubject = claims.Subject
	if existing.EmailVerified {
		return false, nil
	}
	existing.EmailVerified = true
	existing.PasswordHash = ""
	return true, nil
}
