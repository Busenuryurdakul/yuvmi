package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
	waitlistRepo "github.com/masterfabric-go/masterfabric/internal/domain/waitlist/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockSignupRepo struct {
	result waitlistRepo.RegisterResult
	err    error
	last   *model.Signup
}

func (m *mockSignupRepo) Register(_ context.Context, signup *model.Signup) (waitlistRepo.RegisterResult, error) {
	m.last = signup
	return m.result, m.err
}

func testWaitlistConfig() config.WaitlistConfig {
	return config.WaitlistConfig{PrivacyPolicyVersion: "2026-01-01"}
}

func TestSignupUseCase_PersistsNormalizedEmail(t *testing.T) {
	repo := &mockSignupRepo{result: waitlistRepo.RegisterResult{Created: true}}
	uc := usecase.NewSignupUseCase(repo, testWaitlistConfig())

	err := uc.Execute(context.Background(), dto.SignupRequest{
		Email:   "user@example.com",
		Consent: true,
	})

	require.NoError(t, err)
	require.NotNil(t, repo.last)
	assert.Equal(t, "user@example.com", repo.last.EmailNormalized)
	assert.Equal(t, model.SourceWebLanding, repo.last.Source)
	assert.Equal(t, model.LocaleTR, repo.last.Locale)
	assert.Equal(t, "2026-01-01", repo.last.PrivacyPolicyVersion)
	assert.False(t, repo.last.ConsentAt.IsZero())
}

func TestSignupUseCase_DuplicateIsSuccess(t *testing.T) {
	repo := &mockSignupRepo{result: waitlistRepo.RegisterResult{Created: false}}
	uc := usecase.NewSignupUseCase(repo, testWaitlistConfig())

	err := uc.Execute(context.Background(), dto.SignupRequest{
		Email:   "user@example.com",
		Consent: true,
	})

	require.NoError(t, err)
}

func TestSignupUseCase_RepositoryError(t *testing.T) {
	repo := &mockSignupRepo{err: domainErr.New(domainErr.ErrInternal, "db down", nil)}
	uc := usecase.NewSignupUseCase(repo, testWaitlistConfig())

	err := uc.Execute(context.Background(), dto.SignupRequest{
		Email:   "user@example.com",
		Consent: true,
	})

	require.Error(t, err)
	assert.True(t, errors.Is(err, domainErr.ErrInternal))
}

func TestAcceptedResponse(t *testing.T) {
	resp := usecase.AcceptedResponse()
	assert.Equal(t, dto.SignupStatusAccepted, resp.Status)
	assert.Equal(t, dto.SignupSuccessMessage, resp.Message)
}
