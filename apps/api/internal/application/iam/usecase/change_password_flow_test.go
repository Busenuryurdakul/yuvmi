package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type flowRefreshStore struct {
	tokens  map[string]uuid.UUID
	revoked map[string]bool
}

func newFlowRefreshStore() *flowRefreshStore {
	return &flowRefreshStore{tokens: map[string]uuid.UUID{}, revoked: map[string]bool{}}
}

func (s *flowRefreshStore) Create(_ context.Context, userID uuid.UUID, tokenHash string) {
	s.tokens[tokenHash] = userID
}

func (s *flowRefreshStore) RevokeAll(_ context.Context, userID uuid.UUID) {
	for hash, owner := range s.tokens {
		if owner == userID {
			s.revoked[hash] = true
		}
	}
}

func (s *flowRefreshStore) GetValid(_ context.Context, tokenHash string) (uuid.UUID, error) {
	if s.revoked[tokenHash] {
		return uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "invalid refresh token", nil)
	}
	userID, ok := s.tokens[tokenHash]
	if !ok {
		return uuid.Nil, domainErr.New(domainErr.ErrUnauthorized, "invalid refresh token", nil)
	}
	return userID, nil
}

type flowPasswordChangeStore struct {
	users   *changePasswordUserRepo
	refresh *flowRefreshStore
}

func (s *flowPasswordChangeStore) ChangePasswordAndRevokeSessions(_ context.Context, userID uuid.UUID, passwordHash string) error {
	user, err := s.users.GetByID(context.Background(), userID)
	if err != nil {
		return err
	}
	user.PasswordHash = passwordHash
	if err := s.users.Update(context.Background(), user); err != nil {
		return err
	}
	s.refresh.RevokeAll(context.Background(), userID)
	return nil
}

type flowLoginAuth struct {
	users *changePasswordUserRepo
}

func (a *flowLoginAuth) HashPassword(p string) (string, error) {
	return infraAuth.NewJWTService(config.JWTConfig{Secret: "test-secret-key-at-least-32-bytes!", ExpirationHours: 1}).HashPassword(p)
}
func (a *flowLoginAuth) VerifyPassword(hashed, plain string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(hashed), []byte(plain)); err != nil {
		return domainErr.New(domainErr.ErrUnauthorized, "invalid credentials", nil)
	}
	return nil
}
func (a *flowLoginAuth) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "access-token", nil
}
func (a *flowLoginAuth) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return nil, nil
}
func (a *flowLoginAuth) GenerateRefreshToken() (string, error) { return "refresh-token", nil }
func (a *flowLoginAuth) HashRefreshToken(token string) string  { return "hash-" + token }

func TestChangePasswordFlow_RevokesRefreshAndUpdatesLoginPassword(t *testing.T) {
	ctx := context.Background()
	const oldPass = "OldPassword1!"
	const newPass = "NewPassword2!"

	user := userWithPassword(t, oldPass)
	users := &changePasswordUserRepo{user: user}
	refresh := newFlowRefreshStore()
	refresh.Create(ctx, user.ID, "hash-refresh-1")
	refresh.Create(ctx, user.ID, "hash-refresh-2")

	changeUC := usecase.NewChangePasswordUseCase(users, &flowLoginAuth{users: users}, &flowPasswordChangeStore{users: users, refresh: refresh}, config.YuvmiConfig{})
	require.NoError(t, changeUC.Execute(ctx, user.ID, dto.ChangePasswordRequest{
		CurrentPassword: oldPass,
		NewPassword:     newPass,
	}))

	_, err := refresh.GetValid(ctx, "hash-refresh-1")
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrUnauthorized))
	_, err = refresh.GetValid(ctx, "hash-refresh-2")
	require.Error(t, err)

	require.Error(t, bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPass)))
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(newPass)))
}
