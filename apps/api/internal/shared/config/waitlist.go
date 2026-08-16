package config

import (
	"fmt"
	"net"
	"net/url"
	"strings"
	"time"
)

const (
	// ClientIPModeDirect uses the TCP peer (RemoteAddr) and ignores forwarded headers.
	ClientIPModeDirect = "direct"
	// ClientIPModeTrustedCIDRs evaluates X-Forwarded-For only when the peer is in WAITLIST_TRUSTED_PROXY_CIDRS.
	ClientIPModeTrustedCIDRs = "trusted_cidrs"
	// ClientIPModeRender trusts a single CF-Connecting-IP header on a Render web service.
	ClientIPModeRender = "render"

	renderServiceTypeWeb = "web"
)

// WaitlistConfig holds public waitlist endpoint settings.
type WaitlistConfig struct {
	PrivacyPolicyVersion string
	RateLimitRequests    int
	RateLimitWindow      time.Duration
	RateLimitHashKey     string
	TrustedProxyCIDRs    []string
	ClientIPMode         string
	RenderServiceID      string
	RenderServiceType    string
	AppEnv               string
	IsProduction         bool
}

// Validate checks waitlist and HTTP surface configuration for the active environment.
func (c *Config) Validate() error {
	if err := validateClientIPConfig(c.Waitlist); err != nil {
		return err
	}

	if err := validateCORSOrigins(c.Server.CORSAllowedOrigins, c.Waitlist.AppEnv, c.Waitlist.IsProduction); err != nil {
		return err
	}

	if !c.Waitlist.IsProduction {
		return nil
	}

	if strings.TrimSpace(c.Waitlist.PrivacyPolicyVersion) == "" {
		return fmt.Errorf("WAITLIST_PRIVACY_POLICY_VERSION is required when APP_ENV=production")
	}
	if strings.TrimSpace(c.Waitlist.RateLimitHashKey) == "" {
		return fmt.Errorf("WAITLIST_RATE_LIMIT_HASH_KEY is required when APP_ENV=production")
	}

	return nil
}

func validateClientIPConfig(w WaitlistConfig) error {
	mode := strings.ToLower(strings.TrimSpace(w.ClientIPMode))
	if mode == "" {
		mode = ClientIPModeDirect
	}

	switch mode {
	case ClientIPModeDirect:
		return nil
	case ClientIPModeTrustedCIDRs:
		if !w.IsProduction {
			if len(w.TrustedProxyCIDRs) == 0 {
				return nil
			}
			return validateTrustedProxyCIDRs(w.TrustedProxyCIDRs, false)
		}
		return validateTrustedProxyCIDRs(w.TrustedProxyCIDRs, true)
	case ClientIPModeRender:
		if strings.TrimSpace(w.RenderServiceID) == "" {
			return fmt.Errorf("RENDER_SERVICE_ID is required when WAITLIST_CLIENT_IP_MODE=render")
		}
		if strings.ToLower(strings.TrimSpace(w.RenderServiceType)) != renderServiceTypeWeb {
			return fmt.Errorf("RENDER_SERVICE_TYPE must be %q when WAITLIST_CLIENT_IP_MODE=render", renderServiceTypeWeb)
		}
		return nil
	default:
		return fmt.Errorf("unknown WAITLIST_CLIENT_IP_MODE %q (expected direct, trusted_cidrs, or render)", w.ClientIPMode)
	}
}

func validateCORSOrigins(origins []string, appEnv string, isProduction bool) error {
	if isProduction && len(origins) == 0 {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS is required when APP_ENV=production")
	}

	for _, origin := range origins {
		trimmed := strings.TrimSpace(origin)
		if trimmed == "" {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must not contain empty entries")
		}
		if trimmed == "*" {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must not include wildcard")
		}
		if err := validateCORSOrigin(trimmed, appEnv, isProduction); err != nil {
			return err
		}
	}

	return nil
}

func validateCORSOrigin(origin, appEnv string, isProduction bool) error {
	parsed, err := url.Parse(origin)
	if err != nil {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS contains invalid origin %q: %w", origin, err)
	}
	if parsed.Scheme == "" || parsed.Host == "" || parsed.Opaque != "" || parsed.User != nil {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS contains invalid origin %q", origin)
	}
	if parsed.RawQuery != "" || parsed.Fragment != "" || (parsed.Path != "" && parsed.Path != "/") {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS must not include path, query, or fragment: %q", origin)
	}
	canonical := parsed.Scheme + "://" + parsed.Host
	if origin != canonical {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS must be an exact origin (scheme://host[:port]): %q", origin)
	}

	if isProduction {
		if parsed.Scheme != "https" {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must use https in production: %q", origin)
		}
		if isLocalhostHost(parsed.Hostname()) {
			return fmt.Errorf("CORS_ALLOWED_ORIGINS must not include localhost in production: %q", origin)
		}
		return nil
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS contains unsupported scheme in %q", origin)
	}
	if isLocalhostHost(parsed.Hostname()) && appEnv != "development" && appEnv != "test" {
		return fmt.Errorf("CORS_ALLOWED_ORIGINS localhost is only allowed in development/test: %q", origin)
	}

	return nil
}

func isLocalhostHost(host string) bool {
	h := strings.ToLower(strings.TrimSpace(host))
	return h == "localhost" || h == "127.0.0.1" || h == "::1" || h == "[::1]"
}

func validateTrustedProxyCIDRs(cidrs []string, required bool) error {
	if len(cidrs) == 0 {
		if required {
			return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS is required when WAITLIST_CLIENT_IP_MODE=trusted_cidrs and APP_ENV=production")
		}
		return nil
	}

	valid := 0
	for _, cidr := range cidrs {
		trimmed := strings.TrimSpace(cidr)
		if trimmed == "" {
			continue
		}
		_, network, err := net.ParseCIDR(trimmed)
		if err != nil {
			return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS contains invalid CIDR %q: %w", trimmed, err)
		}
		ones, bits := network.Mask.Size()
		if ones == 0 && (bits == 32 || bits == 128) {
			return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS must not include %q", trimmed)
		}
		valid++
	}

	if required && valid == 0 {
		return fmt.Errorf("WAITLIST_TRUSTED_PROXY_CIDRS is required when WAITLIST_CLIENT_IP_MODE=trusted_cidrs and APP_ENV=production")
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

	mode := strings.ToLower(strings.TrimSpace(envOrDefault("WAITLIST_CLIENT_IP_MODE", ClientIPModeDirect)))

	return WaitlistConfig{
		PrivacyPolicyVersion: envOrDefault("WAITLIST_PRIVACY_POLICY_VERSION", ""),
		RateLimitRequests:    envOrDefaultInt("WAITLIST_RATE_LIMIT_REQUESTS", defaultRateLimit),
		RateLimitWindow:      time.Duration(envOrDefaultInt("WAITLIST_RATE_LIMIT_WINDOW", 60)) * time.Second,
		RateLimitHashKey:     hashKey,
		TrustedProxyCIDRs:    envOrDefaultSlice("WAITLIST_TRUSTED_PROXY_CIDRS", nil),
		ClientIPMode:         mode,
		RenderServiceID:      strings.TrimSpace(envOrDefault("RENDER_SERVICE_ID", "")),
		RenderServiceType:    strings.ToLower(strings.TrimSpace(envOrDefault("RENDER_SERVICE_TYPE", ""))),
		AppEnv:               appEnv,
		IsProduction:         isProduction,
	}
}
