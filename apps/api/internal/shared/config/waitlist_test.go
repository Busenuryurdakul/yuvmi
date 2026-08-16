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
			AppEnv:               "production",
			ClientIPMode:         ClientIPModeTrustedCIDRs,
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

func TestValidate_RejectsWildcardCORS(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Server.CORSAllowedOrigins = []string{"*"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "wildcard")
}

func TestValidate_DevelopmentRejectsWildcardCORS(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{CORSAllowedOrigins: []string{"*"}},
		Waitlist: WaitlistConfig{
			IsProduction: false,
			AppEnv:       "development",
			ClientIPMode: ClientIPModeDirect,
		},
	}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "wildcard")
}

func TestValidate_ProductionRequiresHTTPSOrigin(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Server.CORSAllowedOrigins = []string{"http://app.example.com"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "https")
}

func TestValidate_ProductionRejectsOriginPathQueryFragment(t *testing.T) {
	cfg := productionTestConfig()

	for _, origin := range []string{
		"https://app.example.com/waitlist",
		"https://app.example.com?ref=1",
		"https://app.example.com#hash",
	} {
		cfg.Server.CORSAllowedOrigins = []string{origin}
		err := cfg.Validate()
		require.Error(t, err, origin)
		assert.Contains(t, err.Error(), "path, query, or fragment")
	}
}

func TestValidate_ProductionRejectsLocalhostOrigin(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Server.CORSAllowedOrigins = []string{"https://localhost:3000"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "localhost")
}

func TestValidate_DevelopmentAllowsLocalhostOrigin(t *testing.T) {
	cfg := &Config{
		Server: ServerConfig{CORSAllowedOrigins: []string{"http://localhost:3000"}},
		Waitlist: WaitlistConfig{
			IsProduction: false,
			AppEnv:       "development",
			ClientIPMode: ClientIPModeDirect,
		},
	}

	require.NoError(t, cfg.Validate())
}

func TestValidate_ProductionTrustedCIDRsRequired(t *testing.T) {
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

func TestValidate_RejectsUnrestrictedTrustedProxyCIDR(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.TrustedProxyCIDRs = []string{"0.0.0.0/0"}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "must not include")
}

func TestValidate_ProductionDirectModeDoesNotRequireCIDRs(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.ClientIPMode = ClientIPModeDirect
	cfg.Waitlist.TrustedProxyCIDRs = nil

	require.NoError(t, cfg.Validate())
}

func TestValidate_ProductionRenderRequiresServiceIDAndWebType(t *testing.T) {
	cfg := productionTestConfig()
	cfg.Waitlist.ClientIPMode = ClientIPModeRender
	cfg.Waitlist.TrustedProxyCIDRs = nil
	cfg.Waitlist.RenderServiceID = ""
	cfg.Waitlist.RenderServiceType = "web"

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "RENDER_SERVICE_ID")

	cfg.Waitlist.RenderServiceID = "srv-example"
	cfg.Waitlist.RenderServiceType = "pserv"
	err = cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "RENDER_SERVICE_TYPE")

	cfg.Waitlist.RenderServiceType = "web"
	require.NoError(t, cfg.Validate())
}

func TestValidate_UnknownClientIPMode(t *testing.T) {
	cfg := &Config{
		Waitlist: WaitlistConfig{
			IsProduction: false,
			AppEnv:       "development",
			ClientIPMode: "cloudflare",
		},
	}

	err := cfg.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown WAITLIST_CLIENT_IP_MODE")
}

func TestWaitlistConfig_DevelopmentAllowsEmptyPrivacyVersion(t *testing.T) {
	cfg := &Config{
		Waitlist: WaitlistConfig{
			IsProduction: false,
			AppEnv:       "development",
			ClientIPMode: ClientIPModeDirect,
		},
	}

	require.NoError(t, cfg.Validate())
}

func TestLoadWaitlistConfig_DevelopmentDefaults(t *testing.T) {
	os.Setenv("APP_ENV", "development")
	os.Unsetenv("WAITLIST_RATE_LIMIT_HASH_KEY")
	os.Unsetenv("WAITLIST_CLIENT_IP_MODE")
	defer os.Unsetenv("APP_ENV")

	cfg := loadWaitlistConfig()
	assert.False(t, cfg.IsProduction)
	assert.Equal(t, 20, cfg.RateLimitRequests)
	assert.Equal(t, 60*time.Second, cfg.RateLimitWindow)
	assert.NotEmpty(t, cfg.RateLimitHashKey)
	assert.Equal(t, ClientIPModeDirect, cfg.ClientIPMode)
}

func TestLoadWaitlistConfig_ProductionDefaults(t *testing.T) {
	os.Setenv("APP_ENV", "production")
	os.Setenv("WAITLIST_RATE_LIMIT_HASH_KEY", "prod-secret")
	os.Setenv("WAITLIST_PRIVACY_POLICY_VERSION", "2026-01-01")
	os.Setenv("WAITLIST_CLIENT_IP_MODE", ClientIPModeRender)
	os.Setenv("RENDER_SERVICE_ID", "srv-example")
	os.Setenv("RENDER_SERVICE_TYPE", "web")
	defer func() {
		os.Unsetenv("APP_ENV")
		os.Unsetenv("WAITLIST_RATE_LIMIT_HASH_KEY")
		os.Unsetenv("WAITLIST_PRIVACY_POLICY_VERSION")
		os.Unsetenv("WAITLIST_CLIENT_IP_MODE")
		os.Unsetenv("RENDER_SERVICE_ID")
		os.Unsetenv("RENDER_SERVICE_TYPE")
	}()

	cfg := loadWaitlistConfig()
	assert.True(t, cfg.IsProduction)
	assert.Equal(t, 5, cfg.RateLimitRequests)
	assert.Equal(t, "prod-secret", cfg.RateLimitHashKey)
	assert.Equal(t, "2026-01-01", cfg.PrivacyPolicyVersion)
	assert.Equal(t, ClientIPModeRender, cfg.ClientIPMode)
	assert.Equal(t, "srv-example", cfg.RenderServiceID)
	assert.Equal(t, "web", cfg.RenderServiceType)
}

func TestValidate_DoesNotHardcodeVercelOrigin(t *testing.T) {
	cfg := productionTestConfig()
	require.NoError(t, cfg.Validate())
	for _, origin := range cfg.Server.CORSAllowedOrigins {
		assert.NotEqual(t, "https://yumvi.vercel.app", origin)
		assert.NotEqual(t, "https://yuvmi.vercel.app", origin)
	}
}
