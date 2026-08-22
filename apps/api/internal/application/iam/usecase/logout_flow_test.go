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

type memoryRefreshStore struct {
	tokens  map[string]uuid.UUID
	revoked map[string]bool
}

func newMemoryRefreshStore() *memoryRefreshStore {
	return &memoryRefreshStore{
		tokens:  map[string]uuid.UUID{},
		revoked: map[string]bool{},
	}
}

func (s *memoryRefreshStore) Create(_ context.Context, userID uuid.UUID, tokenHash string) {
	s.tokens[tokenHash] = userID
}

func (s *memoryRefreshStore) RevokeForUser(_ context.Context, userID uuid.UUID, tokenHash string) error {
	owner, ok := s.tokens[tokenHash]
	if !ok || owner != userID {
		return nil
	}
	s.revoked[tokenHash] = true
	return nil
}

func (s *memoryRefreshStore) GetValid(_ context.Context, tokenHash string) (uuid.UUID, error) {
	if s.revoked[tokenHash] {
		return uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "invalid refresh token", nil)
	}
	userID, ok := s.tokens[tokenHash]
	if !ok {
		return uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "invalid refresh token", nil)
	}
	return userID, nil
}

type flowAuthService struct {
	store *memoryRefreshStore
}

func (s *flowAuthService) HashPassword(string) (string, error) { return "", nil }
func (s *flowAuthService) VerifyPassword(string, string) error { return nil }
func (s *flowAuthService) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "access-token", nil
}
func (s *flowAuthService) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return nil, nil
}
func (s *flowAuthService) GenerateRefreshToken() (string, error) { return "refresh-token", nil }
func (s *flowAuthService) HashRefreshToken(token string) string  { return "hash-" + token }

func (s *flowAuthService) issue(ctx context.Context, userID uuid.UUID, refresh string) {
	s.store.Create(ctx, userID, s.HashRefreshToken(refresh))
}

func TestLogoutFlow_RegisterLoginLogoutRefreshRejectedRelogin(t *testing.T) {
	ctx := context.Background()
	store := newMemoryRefreshStore()
	auth := &flowAuthService{store: store}
	userID := uuid.New()
	auth.issue(ctx, userID, "refresh-1")

	logoutUC := usecase.NewLogoutUseCase(auth, store)
	require.NoError(t, logoutUC.Execute(ctx, userID, dto.LogoutRequest{RefreshToken: "refresh-1"}))

	_, err := store.GetValid(ctx, auth.HashRefreshToken("refresh-1"))
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrUnauthorized))

	auth.issue(ctx, userID, "refresh-2")
	_, err = store.GetValid(ctx, auth.HashRefreshToken("refresh-2"))
	require.NoError(t, err)
}

func TestLogoutFlow_OtherUserRefreshNotRevoked(t *testing.T) {
	ctx := context.Background()
	store := newMemoryRefreshStore()
	auth := &flowAuthService{store: store}
	userA := uuid.New()
	userB := uuid.New()

	auth.issue(ctx, userB, "refresh-b")
	logoutUC := usecase.NewLogoutUseCase(auth, store)
	require.NoError(t, logoutUC.Execute(ctx, userA, dto.LogoutRequest{RefreshToken: "refresh-b"}))

	_, err := store.GetValid(ctx, auth.HashRefreshToken("refresh-b"))
	require.NoError(t, err)
}
