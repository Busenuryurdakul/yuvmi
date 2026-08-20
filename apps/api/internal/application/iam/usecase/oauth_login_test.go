package usecase

import (
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/require"
)

func TestApplyOAuthLink_RejectsUnverifiedProviderEmail(t *testing.T) {
	existing := &model.User{ID: uuid.New(), Email: "a@b.com", PasswordHash: "hash", EmailVerified: false}
	_, err := applyOAuthLink(existing, "google", &infraAuth.OAuthClaims{Email: "a@b.com", EmailVerified: false, Subject: "sub-1"})
	require.Error(t, err)
	require.ErrorIs(t, err, domainErr.ErrUnauthorized)
	require.Equal(t, "hash", existing.PasswordHash)
	require.False(t, existing.EmailVerified)
}

func TestApplyOAuthLink_DoesNotMergeUnverifiedIntoVerifiedAccount(t *testing.T) {
	existing := &model.User{ID: uuid.New(), Email: "a@b.com", PasswordHash: "hash", EmailVerified: true}
	_, err := applyOAuthLink(existing, "google", &infraAuth.OAuthClaims{Email: "a@b.com", EmailVerified: false, Subject: "sub-1"})
	require.Error(t, err)
	require.Equal(t, "", existing.AuthProvider)
	require.Equal(t, "hash", existing.PasswordHash)
}

func TestApplyOAuthLink_LinksVerifiedAccounts(t *testing.T) {
	existing := &model.User{ID: uuid.New(), Email: "a@b.com", PasswordHash: "hash", EmailVerified: true}
	takeover, err := applyOAuthLink(existing, "google", &infraAuth.OAuthClaims{Email: "a@b.com", EmailVerified: true, Subject: "sub-1"})
	require.NoError(t, err)
	require.False(t, takeover)
	require.Equal(t, "google", existing.AuthProvider)
	require.Equal(t, "sub-1", existing.ProviderSubject)
	require.Equal(t, "hash", existing.PasswordHash)
	require.True(t, existing.EmailVerified)
}

func TestApplyOAuthLink_TakesOverUnverifiedPasswordAccount(t *testing.T) {
	existing := &model.User{ID: uuid.New(), Email: "victim@b.com", PasswordHash: "attacker-hash", EmailVerified: false}
	takeover, err := applyOAuthLink(existing, "google", &infraAuth.OAuthClaims{Email: "victim@b.com", EmailVerified: true, Subject: "real-sub"})
	require.NoError(t, err)
	require.True(t, takeover)
	require.Equal(t, "google", existing.AuthProvider)
	require.Equal(t, "real-sub", existing.ProviderSubject)
	require.Empty(t, existing.PasswordHash)
	require.True(t, existing.EmailVerified)
}
