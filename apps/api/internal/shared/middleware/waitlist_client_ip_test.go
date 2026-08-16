package middleware_test

import (
	"net/http/httptest"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func directCfg() config.WaitlistConfig {
	return config.WaitlistConfig{ClientIPMode: config.ClientIPModeDirect}
}

func trustedCfg(cidrs ...string) config.WaitlistConfig {
	return config.WaitlistConfig{
		ClientIPMode:      config.ClientIPModeTrustedCIDRs,
		TrustedProxyCIDRs: cidrs,
	}
}

func renderCfg() config.WaitlistConfig {
	return config.WaitlistConfig{
		ClientIPMode:      config.ClientIPModeRender,
		RenderServiceID:   "srv-example",
		RenderServiceType: "web",
		IsProduction:      true,
	}
}

func TestResolveClientIP_DirectRequest(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"

	ip, err := middleware.ResolveClientIP(req, directCfg())
	require.NoError(t, err)
	assert.Equal(t, "203.0.113.10", ip)
}

func TestResolveClientIP_DirectIgnoresSpoofedCFConnectingIP(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"
	req.Header.Set("CF-Connecting-IP", "198.51.100.5")
	req.Header.Set("X-Forwarded-For", "198.51.100.9")

	ip, err := middleware.ResolveClientIP(req, directCfg())
	require.NoError(t, err)
	assert.Equal(t, "203.0.113.10", ip)
}

func TestResolveClientIP_SpoofedXFFIgnoredWithoutTrustedProxy(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"
	req.Header.Set("X-Forwarded-For", "198.51.100.5")

	ip, err := middleware.ResolveClientIP(req, trustedCfg())
	require.NoError(t, err)
	assert.Equal(t, "203.0.113.10", ip)
}

func TestResolveClientIP_TrustedProxyUsesXFF(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.5")
	req.Header.Set("CF-Connecting-IP", "203.0.113.99")

	ip, err := middleware.ResolveClientIP(req, trustedCfg("10.0.0.0/8"))
	require.NoError(t, err)
	assert.Equal(t, "198.51.100.5", ip)
}

func TestResolveClientIP_MultipleProxyChain(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.5, 10.0.0.2, 10.0.0.3")

	ip, err := middleware.ResolveClientIP(req, trustedCfg("10.0.0.0/8"))
	require.NoError(t, err)
	assert.Equal(t, "198.51.100.5", ip)
}

func TestResolveClientIP_MalformedHeaderFallsBackToPeer(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "not-an-ip")

	ip, err := middleware.ResolveClientIP(req, trustedCfg("10.0.0.0/8"))
	require.NoError(t, err)
	assert.Equal(t, "10.0.0.1", ip)
}

func TestResolveClientIP_IPv6(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "[2001:db8::1]:443"

	ip, err := middleware.ResolveClientIP(req, directCfg())
	require.NoError(t, err)
	assert.Equal(t, "2001:db8::1", ip)
}

func TestResolveClientIP_IPv6TrustedProxyChain(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "[2001:db8::2]:443"
	req.Header.Set("X-Forwarded-For", "2001:db8::9, 2001:db8::2")

	ip, err := middleware.ResolveClientIP(req, trustedCfg("2001:db8::/32"))
	require.NoError(t, err)
	assert.Equal(t, "2001:db8::9", ip)
}

func TestResolveClientIP_RenderValidIPv4(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.8:12345"
	req.Header.Set("CF-Connecting-IP", "198.51.100.20")
	req.Header.Set("X-Forwarded-For", "203.0.113.1")

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.NoError(t, err)
	assert.Equal(t, "198.51.100.20", ip)
}

func TestResolveClientIP_RenderValidIPv6(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.8:12345"
	req.Header.Set("CF-Connecting-IP", "2001:db8::aa")

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.NoError(t, err)
	assert.Equal(t, "2001:db8::aa", ip)
}

func TestResolveClientIP_RenderMissingHeader(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.8:12345"

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_RenderMalformedHeader(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.Header.Set("CF-Connecting-IP", "not-an-ip")

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_RenderMultipleIPsRejected(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.Header.Set("CF-Connecting-IP", "198.51.100.20, 198.51.100.21")

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_RenderDuplicateHeaderRejected(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.Header.Add("CF-Connecting-IP", "198.51.100.20")
	req.Header.Add("CF-Connecting-IP", "198.51.100.21")

	ip, err := middleware.ResolveClientIP(req, renderCfg())
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_RenderMissingServiceID(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.Header.Set("CF-Connecting-IP", "198.51.100.20")

	cfg := renderCfg()
	cfg.RenderServiceID = ""
	ip, err := middleware.ResolveClientIP(req, cfg)
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_RenderWrongServiceType(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.Header.Set("CF-Connecting-IP", "198.51.100.20")

	cfg := renderCfg()
	cfg.RenderServiceType = "pserv"
	ip, err := middleware.ResolveClientIP(req, cfg)
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}

func TestResolveClientIP_UnknownMode(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"

	ip, err := middleware.ResolveClientIP(req, config.WaitlistConfig{ClientIPMode: "cloudflare"})
	require.ErrorIs(t, err, middleware.ErrClientIPUnavailable)
	assert.Empty(t, ip)
}
