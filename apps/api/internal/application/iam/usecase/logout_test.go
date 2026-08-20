package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockAuthService struct {
	hashFn func(token string) string
}

func (m *mockAuthService) HashPassword(string) (string, error) { return "", nil }
func (m *mockAuthService) VerifyPassword(string, string) error { return nil }
func (m *mockAuthService) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "", nil
}
func (m *mockAuthService) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return nil, nil
}
func (m *mockAuthService) GenerateRefreshToken() (string, error) { return "", nil }
func (m *mockAuthService) HashRefreshToken(token string) string {
	return m.hashFn(token)
}

type mockLogoutRefreshRepo struct {
	calls []revokeCall
	err   error
}

type revokeCall struct {
	userID    uuid.UUID
	tokenHash string
}

func (m *mockLogoutRefreshRepo) RevokeForUser(_ context.Context, userID uuid.UUID, tokenHash string) error {
	m.calls = append(m.calls, revokeCall{userID: userID, tokenHash: tokenHash})
	return m.err
}

func TestLogoutUseCase_OwnRefreshTokenRevoked(t *testing.T) {
	userID := uuid.New()
	repo := &mockLogoutRefreshRepo{}
	auth := &mockAuthService{hashFn: func(token string) string { return "hash-" + token }}
	uc := usecase.NewLogoutUseCase(auth, repo)

	err := uc.Execute(context.Background(), userID, dto.LogoutRequest{RefreshToken: "refresh-a"})
	require.NoError(t, err)
	require.Len(t, repo.calls, 1)
	assert.Equal(t, userID, repo.calls[0].userID)
	assert.Equal(t, "hash-refresh-a", repo.calls[0].tokenHash)
}

func TestLogoutUseCase_IdempotentWhenAlreadyRevoked(t *testing.T) {
	repo := &mockLogoutRefreshRepo{}
	auth := &mockAuthService{hashFn: func(token string) string { return "hash-" + token }}
	uc := usecase.NewLogoutUseCase(auth, repo)

	req := dto.LogoutRequest{RefreshToken: "refresh-a"}
	require.NoError(t, uc.Execute(context.Background(), uuid.New(), req))
	require.NoError(t, uc.Execute(context.Background(), uuid.New(), req))
	assert.Len(t, repo.calls, 2)
}

func TestLogoutUseCase_OtherUserTokenUsesAuthenticatedUserID(t *testing.T) {
	userA := uuid.New()
	repo := &mockLogoutRefreshRepo{}
	auth := &mockAuthService{hashFn: func(token string) string { return "hash-other-user-token" }}
	uc := usecase.NewLogoutUseCase(auth, repo)

	err := uc.Execute(context.Background(), userA, dto.LogoutRequest{RefreshToken: "other-user-token"})
	require.NoError(t, err)
	require.Len(t, repo.calls, 1)
	assert.Equal(t, userA, repo.calls[0].userID)
	assert.Equal(t, "hash-other-user-token", repo.calls[0].tokenHash)
}

func TestLogoutUseCase_EmptyRefreshToken400(t *testing.T) {
	uc := usecase.NewLogoutUseCase(
		&mockAuthService{hashFn: func(token string) string { return token }},
		&mockLogoutRefreshRepo{},
	)

	err := uc.Execute(context.Background(), uuid.New(), dto.LogoutRequest{})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrBadRequest))
}

func TestLogoutUseCase_DBError500(t *testing.T) {
	repo := &mockLogoutRefreshRepo{err: domainErr.New(domainErr.ErrInternal, "failed to revoke refresh token", errors.New("db down"))}
	uc := usecase.NewLogoutUseCase(
		&mockAuthService{hashFn: func(token string) string { return "hash" }},
		repo,
	)

	err := uc.Execute(context.Background(), uuid.New(), dto.LogoutRequest{RefreshToken: "refresh-a"})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrInternal))
}

func TestLogoutUseCase_DoesNotRevokeAllForUser(t *testing.T) {
	repo := &mockLogoutRefreshRepo{}
	uc := usecase.NewLogoutUseCase(
		&mockAuthService{hashFn: func(token string) string { return "hash-" + token }},
		repo,
	)

	require.NoError(t, uc.Execute(context.Background(), uuid.New(), dto.LogoutRequest{RefreshToken: "one-device"}))
	assert.Len(t, repo.calls, 1)
}
