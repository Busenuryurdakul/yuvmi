package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type changePasswordUserRepo struct {
	user *model.User
}

func (r *changePasswordUserRepo) Create(context.Context, *model.User) error { return nil }
func (r *changePasswordUserRepo) GetByID(_ context.Context, id uuid.UUID) (*model.User, error) {
	if r.user == nil || r.user.ID != id {
		return nil, domainErr.New(domainErr.ErrNotFound, "user not found", nil)
	}
	return r.user, nil
}
func (r *changePasswordUserRepo) GetByEmail(context.Context, string) (*model.User, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "user not found", nil)
}
func (r *changePasswordUserRepo) GetByProvider(context.Context, string, string) (*model.User, error) {
	return nil, domainErr.New(domainErr.ErrNotFound, "user not found", nil)
}
func (r *changePasswordUserRepo) Update(_ context.Context, user *model.User) error {
	r.user = user
	return nil
}
func (r *changePasswordUserRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (r *changePasswordUserRepo) List(context.Context, int, int) ([]*model.User, int, error) {
	return nil, 0, nil
}

type mockPasswordChangeStore struct {
	calls     []passwordChangeCall
	err       error
	lastHash  string
	committed bool
}

type passwordChangeCall struct {
	userID       uuid.UUID
	passwordHash string
}

func (m *mockPasswordChangeStore) ChangePasswordAndRevokeSessions(_ context.Context, userID uuid.UUID, passwordHash string) error {
	m.calls = append(m.calls, passwordChangeCall{userID: userID, passwordHash: passwordHash})
	if m.err != nil {
		return m.err
	}
	m.lastHash = passwordHash
	m.committed = true
	return nil
}

func newChangePasswordUC(t *testing.T, user *model.User, store *mockPasswordChangeStore) *usecase.ChangePasswordUseCase {
	t.Helper()
	jwtSvc := infraAuth.NewJWTService(config.JWTConfig{
		Secret:          "test-secret-key-at-least-32-bytes!",
		ExpirationHours: 1,
	})
	return usecase.NewChangePasswordUseCase(&changePasswordUserRepo{user: user}, jwtSvc, store, config.YuvmiConfig{})
}

func userWithPassword(t *testing.T, password string) *model.User {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)
	return &model.User{
		ID:           uuid.New(),
		Email:        "user@example.com",
		PasswordHash: string(hash),
		Status:       model.UserStatusActive,
	}
}

func TestChangePasswordUseCase_Success(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	store := &mockPasswordChangeStore{}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: current,
		NewPassword:     "NewPassword2!",
	})
	require.NoError(t, err)
	require.Len(t, store.calls, 1)
	assert.Equal(t, user.ID, store.calls[0].userID)
	assert.NotEqual(t, user.PasswordHash, store.calls[0].passwordHash)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(store.calls[0].passwordHash), []byte("NewPassword2!")))
}

func TestChangePasswordUseCase_WrongCurrentPassword400Not401(t *testing.T) {
	user := userWithPassword(t, "OldPassword1!")
	store := &mockPasswordChangeStore{}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: "WrongPassword1!",
		NewPassword:     "NewPassword2!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrBadRequest))
	assert.False(t, errors.Is(err, domainErr.ErrUnauthorized))
	assert.Empty(t, store.calls)
}

func TestChangePasswordUseCase_SamePassword400(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	store := &mockPasswordChangeStore{}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: current,
		NewPassword:     current,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrBadRequest))
	assert.Empty(t, store.calls)
}

func TestChangePasswordUseCase_OAuthOnly400(t *testing.T) {
	user := &model.User{
		ID:           uuid.New(),
		Email:        "oauth@example.com",
		AuthProvider: "google",
		PasswordHash: "",
		Status:       model.UserStatusActive,
	}
	store := &mockPasswordChangeStore{}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: "anything",
		NewPassword:     "NewPassword2!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrBadRequest))
	assert.Empty(t, store.calls)
}

func TestChangePasswordUseCase_DevPasswordBlocked403(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	store := &mockPasswordChangeStore{}
	uc := usecase.NewChangePasswordUseCase(
		&changePasswordUserRepo{user: user},
		infraAuth.NewJWTService(config.JWTConfig{Secret: "test-secret-key-at-least-32-bytes!", ExpirationHours: 1}),
		store,
		config.YuvmiConfig{DevOAuthPassword: "yuvmi-dev-12345678"},
	)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: current,
		NewPassword:     "yuvmi-dev-12345678",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrForbidden))
	assert.Empty(t, store.calls)
}

func TestChangePasswordUseCase_StoreError500(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	store := &mockPasswordChangeStore{
		err: domainErr.New(domainErr.ErrInternal, "failed to commit password change", errors.New("db down")),
	}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: current,
		NewPassword:     "NewPassword2!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrInternal))
}

func TestChangePasswordUseCase_TransactionRollbackPasswordUnchanged(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	originalHash := user.PasswordHash
	store := &mockPasswordChangeStore{
		err: domainErr.New(domainErr.ErrInternal, "failed to revoke refresh tokens", errors.New("revoke failed")),
	}
	uc := newChangePasswordUC(t, user, store)

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: current,
		NewPassword:     "NewPassword2!",
	})
	require.Error(t, err)
	assert.False(t, store.committed)
	assert.Equal(t, originalHash, user.PasswordHash)
}

// Ensure mock auth service is not used for current password (VerifyPassword returns 401).
type unauthorizedVerifyAuth struct {
	service.AuthService
}

func (unauthorizedVerifyAuth) VerifyPassword(string, string) error {
	return domainErr.New(domainErr.ErrUnauthorized, "invalid credentials", nil)
}

func TestChangePasswordUseCase_DoesNotUseVerifyPassword401(t *testing.T) {
	const current = "OldPassword1!"
	user := userWithPassword(t, current)
	store := &mockPasswordChangeStore{}
	jwtSvc := infraAuth.NewJWTService(config.JWTConfig{Secret: "test-secret-key-at-least-32-bytes!", ExpirationHours: 1})
	uc := usecase.NewChangePasswordUseCase(&changePasswordUserRepo{user: user}, unauthorizedVerifyAuth{jwtSvc}, store, config.YuvmiConfig{})

	err := uc.Execute(context.Background(), user.ID, dto.ChangePasswordRequest{
		CurrentPassword: "WrongPassword1!",
		NewPassword:     "NewPassword2!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrBadRequest))
	assert.False(t, errors.Is(err, domainErr.ErrUnauthorized))
}
