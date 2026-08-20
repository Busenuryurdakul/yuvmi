package usecase

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	iamEvent "github.com/masterfabric-go/masterfabric/internal/domain/iam/event"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
)

const emailVerificationTTL = 24 * time.Hour

// RegisterUseCase handles user registration.
type RegisterUseCase struct {
	userRepo   repository.UserRepository
	auth       service.AuthService
	eventBus   events.EventBus
	verifyRepo tokenStore
	yuvmiCfg   config.YuvmiConfig
	smtp       config.SMTPConfig
	log        *slog.Logger
	production bool
}

// NewRegisterUseCase creates a new RegisterUseCase.
func NewRegisterUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	eventBus events.EventBus,
	verifyRepo tokenStore,
	yuvmiCfg config.YuvmiConfig,
	smtp config.SMTPConfig,
	log *slog.Logger,
	production bool,
) *RegisterUseCase {
	return &RegisterUseCase{
		userRepo:   userRepo,
		auth:       auth,
		eventBus:   eventBus,
		verifyRepo: verifyRepo,
		yuvmiCfg:   yuvmiCfg,
		smtp:       smtp,
		log:        log,
		production: production,
	}
}

// Execute registers a new user. The account cannot sign in until the email is verified,
// except in local development with no SMTP (so the seed/dev loop still works).
func (uc *RegisterUseCase) Execute(ctx context.Context, req dto.RegisterRequest) (*dto.UserInfo, error) {
	if IsDevPasswordBlocked(uc.yuvmiCfg, req.Password) {
		return nil, domainErr.New(domainErr.ErrForbidden, "dev auth bridge is disabled", nil)
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	existing, _ := uc.userRepo.GetByEmail(ctx, req.Email)
	if existing != nil {
		return nil, domainErr.New(domainErr.ErrAlreadyExists, "user with this email already exists", nil)
	}

	hash, err := uc.auth.HashPassword(req.Password)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to hash password", err)
	}

	autoVerify := !uc.production && uc.smtp.Host == ""
	user := &model.User{
		Email:         req.Email,
		PasswordHash:  hash,
		FirstName:     req.FirstName,
		LastName:      req.LastName,
		Status:        model.UserStatusActive,
		EmailVerified: autoVerify,
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	if !autoVerify {
		if err := sendVerificationEmail(ctx, uc.auth, uc.verifyRepo, uc.yuvmiCfg, uc.smtp, uc.log, user); err != nil && uc.log != nil {
			uc.log.Error("failed to issue email verification", "error", err)
		}
	}

	_ = uc.eventBus.Publish(ctx, events.TopicIAM, iamEvent.UserRegistered{
		UserID:    user.ID,
		Email:     user.Email,
		Timestamp: time.Now().UTC(),
	})

	return &dto.UserInfo{
		ID:            user.ID,
		Email:         user.Email,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		EmailVerified: user.EmailVerified,
		Status:        string(user.Status),
		CreatedAt:     user.CreatedAt,
	}, nil
}
