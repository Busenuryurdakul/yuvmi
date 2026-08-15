package usecase

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
)

// ForgotPasswordUseCase initiates password reset.
type ForgotPasswordUseCase struct {
	userRepo  repository.UserRepository
	auth      service.AuthService
	resetRepo *pgIam.PasswordResetRepo
	cfg       config.YuvmiConfig
	smtp      config.SMTPConfig
	log       *slog.Logger
}

func NewForgotPasswordUseCase(
	userRepo repository.UserRepository,
	auth service.AuthService,
	resetRepo *pgIam.PasswordResetRepo,
	cfg config.YuvmiConfig,
	smtp config.SMTPConfig,
	log *slog.Logger,
) *ForgotPasswordUseCase {
	return &ForgotPasswordUseCase{userRepo: userRepo, auth: auth, resetRepo: resetRepo, cfg: cfg, smtp: smtp, log: log}
}

func (uc *ForgotPasswordUseCase) Execute(ctx context.Context, req dto.ForgotPasswordRequest) error {
	user, err := uc.userRepo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(req.Email)))
	if err != nil {
		// Do not reveal whether the email exists.
		return nil
	}
	if user.AuthProvider != "" && user.PasswordHash == "" {
		return nil
	}

	token, err := generateResetToken()
	if err != nil {
		return domainErr.New(domainErr.ErrInternal, "failed to generate reset token", err)
	}

	expiresAt := time.Now().UTC().Add(time.Hour)
	if err := uc.resetRepo.Create(ctx, user.ID, uc.auth.HashRefreshToken(token), expiresAt); err != nil {
		return err
	}

	resetURL := fmt.Sprintf("%s/reset-password?token=%s", strings.TrimRight(uc.cfg.AppBaseURL, "/"), token)
	if uc.smtp.Host != "" {
		if err := uc.sendEmail(user.Email, "Yuvmi şifre sıfırlama", fmt.Sprintf("Şifrenizi sıfırlamak için: %s\n\nBağlantı 1 saat geçerlidir.", resetURL)); err != nil && uc.log != nil {
			uc.log.Error("failed to send password reset email", "error", err)
		}
	} else if uc.cfg.LogPasswordReset && uc.log != nil {
		uc.log.Info("password reset token (dev/staging)", "email", user.Email, "reset_url", resetURL)
	}
	return nil
}

func (uc *ForgotPasswordUseCase) sendEmail(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", uc.smtp.Host, uc.smtp.Port)
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", to, subject, body))
	auth := smtp.PlainAuth("", uc.smtp.User, uc.smtp.Password, uc.smtp.Host)
	return smtp.SendMail(addr, auth, uc.smtp.From, []string{to}, msg)
}

func generateResetToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
