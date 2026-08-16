package config

import (
	"fmt"
	"net"
	"strings"
	"time"
)

// WaitlistConfig holds public waitlist endpoint settings.
type WaitlistConfig struct {
	PrivacyPolicyVersion string
	RateLimitRequests    int
	RateLimitWindow      time.Duration
	RateLimitHashKey     string
	TrustedProxyCIDRs    []string
	IsProduction         bool
}

// Validate checks waitlist and HTTP surface configuration for the active environment.
func (c *Config) Validate() error {
	if !c.Waitlist.IsProduction {
		return nil
	}

	if err := validateProductionCORS(c.Server.CORSAllowedOrigins); err != nil {
		return err
	}

	if strings.TrimSpace(c.Waitlist.PrivacyPolicyVersion) == "" {
		return fmt.Errorf("WAITLIST_PRIVACY_POLICY_VERSION is required when APP_ENV=production")
	}
	if strings.TrimSpace(c.Waitlist.RateLimitHashKey) == "" {
		return fmt.Errorf("WAITLIST_RATE_LIMIT_HASH_KEY is required when APP_ENV=production")
	}
	if err := validateTrustedProxyCIDRs(c.Waitlist.TrustedProxyCIDRs); err != nil {
		return err
	}

	return nil
}

func validateProductionCORS(origins []string) error {
	if len(origins) == 0 {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS is required when APP_ENV=production")
	}

	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed == "" {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must not contain empty entries when APP_ENV=production")
		}
		if trimmed == "*" {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must not include wildcard when APP_ENV=production")
		}
	}

	return nil
}

func validateTrustedProxyCIDRs(cidrs []string) error {
	if len(cidrs) == 0 {
		return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS is required when APP_ENV=production (reverse proxy client IP)")
	}

	valid := 0
	for _, cidr := range cidrs {
		trimmed := strings.TrimSpace(cidr)
		if trimmed == "" {
			continue
		}
		if _, _, err := net.ParseCIDR(trimmed); err != nil {
			return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS contains invalid CIDR %q: %w", trimmed, err)
		}
		valid++
	}

	if valid == 0 {
		return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS is required when APP_ENV=production (reverse proxy client IP)")
	}

	return nil
}

func loadWaitlistConfig() WaitlistConfig {
	appEnv := envOrDefault("APP_ENV", "development")
	isProduction := appEnv == "production"

	defaultRateLimit := 20
	if isProduction {
		defaultRateLimit = 5
	}

	hashKey := envOrDefault("WAITLIST_RATE_LIMIT_HASH_KEY", "")
	if !isProduction && hashKey == "" {
		hashKey = "dev-waitlist-rate-limit-key"
	}

	return WaitlistConfig{
		PrivacyPolicyVersion: envOrDefault("WAITLIST_PRIVACY_POLICY_VERSION", ""),
		RateLimitRequests:    envOrDefaultInt("WAITLIST_RATE_LIMIT_REQUESTS", defaultRateLimit),
		RateLimitWindow:      time.Duration(envOrDefaultInt("WAITLIST_RATE_LIMIT_WINDOW", 60)) * time.Second,
		RateLimitHashKey:     hashKey,
		TrustedProxyCIDRs:    envOrDefaultSlice("WAITLIST_TRUSTED_PROXY_CIDRS", nil),
		IsProduction:         isProduction,
	}
}
