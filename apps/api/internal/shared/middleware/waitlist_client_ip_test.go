package middleware_test

import (
	"net/http/httptest"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
)

func TestResolveClientIP_DirectRequest(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"

	ip := middleware.ResolveClientIP(req, nil)
	assert.Equal(t, "203.0.113.10", ip)
}

func TestResolveClientIP_SpoofedXFFIgnoredWithoutTrustedProxy(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "203.0.113.10:443"
	req.Header.Set("X-Forwarded-For", "198.51.100.5")

	ip := middleware.ResolveClientIP(req, nil)
	assert.Equal(t, "203.0.113.10", ip)
}

func TestResolveClientIP_TrustedProxyUsesXFF(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.5")

	ip := middleware.ResolveClientIP(req, []string{"10.0.0.0/8"})
	assert.Equal(t, "198.51.100.5", ip)
}

func TestResolveClientIP_MultipleProxyChain(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "198.51.100.5, 10.0.0.2, 10.0.0.3")

	ip := middleware.ResolveClientIP(req, []string{"10.0.0.0/8"})
	assert.Equal(t, "198.51.100.5", ip)
}

func TestResolveClientIP_MalformedHeaderFallsBackToPeer(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "10.0.0.1:12345"
	req.Header.Set("X-Forwarded-For", "not-an-ip")

	ip := middleware.ResolveClientIP(req, []string{"10.0.0.0/8"})
	assert.Equal(t, "10.0.0.1", ip)
}

func TestResolveClientIP_IPv6(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "[2001:db8::1]:443"

	ip := middleware.ResolveClientIP(req, nil)
	assert.Equal(t, "2001:db8::1", ip)
}

func TestResolveClientIP_IPv6TrustedProxyChain(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "[2001:db8::2]:443"
	req.Header.Set("X-Forwarded-For", "2001:db8::9, 2001:db8::2")

	ip := middleware.ResolveClientIP(req, []string{"2001:db8::/32"})
	assert.Equal(t, "2001:db8::9", ip)
}
