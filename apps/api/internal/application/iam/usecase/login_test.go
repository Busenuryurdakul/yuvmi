package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/require"
)

type stubUsers struct {
	user *model.User
}

func (s *stubUsers) Create(context.Context, *model.User) error { return errors.New("unused") }
func (s *stubUsers) GetByID(context.Context, uuid.UUID) (*model.User, error) {
	return s.user, nil
}
func (s *stubUsers) GetByEmail(context.Context, string) (*model.User, error) {
	return s.user, nil
}
func (s *stubUsers) GetByProvider(context.Context, string, string) (*model.User, error) {
	return nil, errors.New("unused")
}
func (s *stubUsers) Update(context.Context, *model.User) error { return nil }
func (s *stubUsers) Delete(context.Context, uuid.UUID) error   { return errors.New("unused") }
func (s *stubUsers) List(context.Context, int, int) ([]*model.User, int, error) {
	return nil, 0, errors.New("unused")
}

type stubAuth struct{}

func (stubAuth) HashPassword(string) (string, error) { return "", nil }
func (stubAuth) VerifyPassword(string, string) error { return nil }
func (stubAuth) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "", errors.New("unused")
}
func (stubAuth) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return nil, errors.New("unused")
}
func (stubAuth) GenerateRefreshToken() (string, error) { return "", errors.New("unused") }
func (stubAuth) HashRefreshToken(string) string        { return "" }

func TestLogin_RejectsUnverifiedEmail(t *testing.T) {
	user := &model.User{
		ID:            uuid.New(),
		Email:         "a@b.com",
		PasswordHash:  "hash",
		Status:        model.UserStatusActive,
		EmailVerified: false,
	}
	uc := NewLoginUseCase(&stubUsers{user: user}, stubAuth{}, nil, config.YuvmiConfig{})
	_, err := uc.Execute(context.Background(), dto.LoginRequest{Email: user.Email, Password: "password1"})
	require.Error(t, err)
	require.True(t, errors.Is(err, domainErr.ErrForbidden))
}
