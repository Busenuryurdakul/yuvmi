package usecase

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

type tokenStore interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error
	Consume(ctx context.Context, tokenHash string) (uuid.UUID, error)
}

// VerifyEmailUseCase marks an account's email as verified.
type VerifyEmailUseCase struct {
	userRepo   repository.UserRepository
	auth       service.AuthService
	verifyRepo tokenStore
}

func NewVerifyEmailUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	verifyRepo tokenStore,
) *VerifyEmailUseCase {
	return &VerifyEmailUseCase{userRepo: userRepo, auth: auth, verifyRepo: verifyRepo}
}

func (uc *VerifyEmailUseCase) Execute(ctx context.Context, req dto.VerifyEmailRequest) error {
	userID, err := uc.verifyRepo.Consume(ctx, uc.auth.HashRefreshToken(req.Token))
	if err != nil {
		return err
	}
	user, err := uc.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	user.EmailVerified = true
	return uc.userRepo.Update(ctx, user)
}

// ResendVerificationUseCase issues a new verification email.
type ResendVerificationUseCase struct {
	userRepo   repository.UserRepository
	auth       service.AuthService
	verifyRepo tokenStore
	yuvmiCfg   config.YuvmiConfig
	smtp       config.SMTPConfig
	log        *slog.Logger
}

func NewResendVerificationUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	verifyRepo tokenStore,
	yuvmiCfg config.YuvmiConfig,
	smtp config.SMTPConfig,
	log *slog.Logger,
) *ResendVerificationUseCase {
	return &ResendVerificationUseCase{
		userRepo:   userRepo,
		auth:       auth,
		verifyRepo: verifyRepo,
		yuvmiCfg:   yuvmiCfg,
		smtp:       smtp,
		log:        log,
	}
}

func (uc *ResendVerificationUseCase) Execute(ctx context.Context, req dto.ResendVerificationRequest) error {
	user, err := uc.userRepo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(req.Email)))
	if err != nil || user == nil {
		// Do not reveal whether the email exists.
		return nil
	}
	if user.EmailVerified {
		return nil
	}
	return sendVerificationEmail(ctx, uc.auth, uc.verifyRepo, uc.yuvmiCfg, uc.smtp, uc.log, user)
}

func sendVerificationEmail(
	ctx context.Context,
	auth service.AuthService,
	verifyRepo tokenStore,
	yuvmiCfg config.YuvmiConfig,
	smtpCfg config.SMTPConfig,
	log *slog.Logger,
	user *model.User,
) error {
	if verifyRepo == nil {
		return nil
	}
	token, err := generateResetToken()
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to generate verification token", err)
	}
	expiresAt := time.Now().UTC().Add(emailVerificationTTL)
	if err := verifyRepo.Create(ctx, user.ID, auth.HashRefreshToken(token), expiresAt); err != nil {
		return err
	}
	verifyURL := fmt.Sprintf("%s/verify-email?token=%s", strings.TrimRight(yuvmiCfg.AppBaseURL, "/"), token)
	deliverAuthEmail(
		smtpCfg,
		log,
		yuvmiCfg.LogPasswordReset,
		user.Email,
		"Yuvmi e-posta doğrulama",
		fmt.Sprintf("Hesabını doğrulamak için: %s\n\nBağlantı 24 saat geçerlidir.", verifyURL),
		verifyURL,
	)
	return nil
}
