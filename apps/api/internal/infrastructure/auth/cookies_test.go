package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/stretchr/testify/require"
)

func TestWantsCookieSession(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	require.False(t, WantsCookieSession(r))
	r.Header.Set(ClientHeader, "web")
	require.True(t, WantsCookieSession(r))
}

func TestAccessTokenFromRequest_PrefersBearer(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Authorization", "Bearer header-token")
	r.AddCookie(&http.Cookie{Name: AccessCookieName, Value: "cookie-token"})
	token, fromCookie := AccessTokenFromRequest(r)
	require.Equal(t, "header-token", token)
	require.False(t, fromCookie)
}

func TestAccessTokenFromRequest_FallsBackToCookie(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.AddCookie(&http.Cookie{Name: AccessCookieName, Value: "cookie-token"})
	token, fromCookie := AccessTokenFromRequest(r)
	require.Equal(t, "cookie-token", token)
	require.True(t, fromCookie)
}

func TestSetAuthCookies_HttpOnly(t *testing.T) {
	cfg := CookieConfig{
		Secure:   true,
		SameSite: http.SameSiteNoneMode,
		Access:   time.Hour,
		Refresh:  24 * time.Hour,
	}
	rec := httptest.NewRecorder()
	SetAuthCookies(rec, cfg, "access", "refresh")
	cookies := rec.Result().Cookies()
	require.Len(t, cookies, 2)
	for _, c := range cookies {
		require.True(t, c.HttpOnly)
		require.True(t, c.Secure)
		require.Equal(t, http.SameSiteNoneMode, c.SameSite)
		require.NotContains(t, c.Name, "token")
	}
}

func TestNewCookieConfig_NoneImpliesSecure(t *testing.T) {
	off := false
	cfg := NewCookieConfig(&config.Config{
		Environment: "development",
		Server:      config.ServerConfig{AuthCookieSecure: &off, AuthCookieSameSite: "none"},
	}, time.Hour, time.Hour)
	require.True(t, cfg.Secure)
	require.Equal(t, http.SameSiteNoneMode, cfg.SameSite)
}
