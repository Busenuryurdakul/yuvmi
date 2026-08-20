package usecase

import (
	"fmt"
	"log/slog"
	"net/smtp"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

func deliverAuthEmail(smtpCfg config.SMTPConfig, log *slog.Logger, logLinks bool, to, subject, body, link string) {
	if smtpCfg.Host != "" {
		if err := sendSMTP(smtpCfg, to, subject, body); err != nil && log != nil {
			log.Error("failed to send auth email", "error", err)
		}
		return
	}
	if logLinks && log != nil {
		log.Info("auth email (dev/staging)", "email", to, "link", link)
	}
}

func sendSMTP(cfg config.SMTPConfig, to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", to, subject, body))
	auth := smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	return smtp.SendMail(addr, auth, cfg.From, []string{to}, msg)
}
