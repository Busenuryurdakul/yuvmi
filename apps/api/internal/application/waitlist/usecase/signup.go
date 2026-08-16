package usecase

import (
	"context"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
	waitlistRepo "github.com/masterfabric-go/masterfabric/internal/domain/waitlist/repository"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

// SignupUseCase handles public waitlist registration.
type SignupUseCase struct {
	repo waitlistRepo.SignupRepository
	cfg  config.WaitlistConfig
}

// NewSignupUseCase creates a new SignupUseCase.
func NewSignupUseCase(repo waitlistRepo.SignupRepository, cfg config.WaitlistConfig) *SignupUseCase {
	return &SignupUseCase{repo: repo, cfg: cfg}
}

// Execute validates and registers a waitlist signup.
func (uc *SignupUseCase) Execute(ctx context.Context, req dto.SignupRequest) (waitlistRepo.RegisterResult, error) {
	now := time.Now().UTC()

	signup := &model.Signup{
		EmailNormalized:      req.Email,
		Source:               model.SourceWebLanding,
		Locale:               model.LocaleTR,
		ConsentAt:            now,
		PrivacyPolicyVersion: uc.cfg.PrivacyPolicyVersion,
	}

	result, err := uc.repo.Register(ctx, signup)
	if err != nil {
		return waitlistRepo.RegisterResult{}, err
	}
	return result, nil
}

// AcceptedResponse returns the uniform success payload.
func AcceptedResponse() dto.SignupResponse {
	return dto.SignupResponse{
		Status:  dto.SignupStatusAccepted,
		Message: dto.SignupSuccessMessage,
	}
}
