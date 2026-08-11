package usecase

import (
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

func IsDevPasswordBlocked(cfg config.YuvmiConfig, password string) bool {
	if cfg.AllowDevOAuth {
		return false
	}
	return password == cfg.DevOAuthPassword
}
