package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func productionTestConfig() *Config {
	return &Config{
		Server: ServerConfig{
			CORSAllowedOrigins: []string{"https://app.example.com"},
		},
		Waitlist: WaitlistConfig{
			IsProduction:         true,
			PrivacyPolicyVersion: "2026-01-01",
			RateLimitHashKey:     "prod-hash-key",
			TrustedProxyCIDRs:    []string{"10.0.0.0/8"},
		},
	}
}

func TestWaitlistConfig_ProductionRequiresPrivacyVersion(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.PrivacyPolicyVersion = ""

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "WAITLIST_PRIVACY_POLICY_VERSION")
}

func TestWaitlistConfig_ProductionRequiresHashKey(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.RateLimitHashKey = ""

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "WAITLIST_RATE_LIMIT_HASH_KEY")
}

func TestValidate_ProductionRequiresExplicitCORS(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Server.CORSAllowedOrigins = nil

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "CORS_ALLOWED_ORIGINS")
}

func TestValidate_ProductionRejectsWildcardCORS(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Server.CORSAllowedOrigins = []string{"*"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "wildcard")
}

func TestValidate_ProductionRequiresTrustedProxyCIDRs(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.TrustedProxyCIDRs = nil

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "WAITLIST_TRUSTED_PROXY_CIDRS")
}

func TestValidate_ProductionRejectsInvalidTrustedProxyCIDR(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.TrustedProxyCIDRs = []string{"not-a-cidr"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid CIDR")
}

func TestWaitlistConfig_DevelopmentAllowsEmptyPrivacyVersion(t *testing.T) {
	cfg := &Config{
		Waitlist: WaitlistConfig{
			IsProduction: false,
		},
	}

	require.NoError(t, cfg.Validate())
}

func TestLoadWaitlistConfig_DevelopmentDefaults(t *testing.T) {
	os.Setenv("APP_ENV", "development")
	os.Unsetenv("WAITLIST_RATE_LIMIT_HASH_KEY")
	defer os.Unsetenv("APP_ENV")

	cfg := loadWaitlistConfig()
	assert.False(t, cfg.IsProduction)
	assert.Equal(t, 20, cfg.RateLimitRequests)
	assert.Equal(t, 60*time.Second, cfg.RateLimitWindow)
	assert.NotEmpty(t, cfg.RateLimitHashKey)
}

func TestLoadWaitlistConfig_ProductionDefaults(t *testing.T) {
	os.Setenv("APP_ENV", "production")
	os.Setenv("WAITLIST_RATE_LIMIT_HASH_KEY", "prod-secret")
	os.Setenv("WAITLIST_PRIVACY_POLICY_VERSION", "2026-01-01")
	defer func() {
		os.Unsetenv("APP_ENV")
		os.Unsetenv("WAITLIST_RATE_LIMIT_HASH_KEY")
		os.Unsetenv("WAITLIST_PRIVACY_POLICY_VERSION")
	}()

	cfg := loadWaitlistConfig()
	assert.True(t, cfg.IsProduction)
	assert.Equal(t, 5, cfg.RateLimitRequests)
	assert.Equal(t, "prod-secret", cfg.RateLimitHashKey)
	assert.Equal(t, "2026-01-01", cfg.PrivacyPolicyVersion)
}
