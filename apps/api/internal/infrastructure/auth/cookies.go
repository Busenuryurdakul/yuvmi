package auth

import (
	"net/http"
	"strings"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

const (
	AccessCookieName  = "yuvmi_access"
	RefreshCookieName = "yuvmi_refresh"
	ClientHeader      = "X-Yuvmi-Client"
	ClientWeb         = "web"
)

// CookieConfig controls how auth cookies are issued to browsers.
type CookieConfig struct {
	Secure   bool
	SameSite http.SameSite
	Domain   string
	Access   time.Duration
	Refresh  time.Duration
}

func NewCookieConfig(cfg *config.Config, accessTTL, refreshTTL time.Duration) CookieConfig {
	sameSite := http.SameSiteNoneMode
	switch strings.ToLower(strings.TrimSpace(cfg.Server.AuthCookieSameSite)) {
	case "lax":
		sameSite = http.SameSiteLaxMode
	case "strict":
		sameSite = http.SameSiteStrictMode
	case "none", "":
		sameSite = http.SameSiteNoneMode
	}
	secure := cfg.IsProduction()
	if cfg.Server.AuthCookieSecure != nil {
		secure = *cfg.Server.AuthCookieSecure
	}
	if sameSite == http.SameSiteNoneMode {
		secure = true
	}
	return CookieConfig{
		Secure:   secure,
		SameSite: sameSite,
		Domain:   cfg.Server.AuthCookieDomain,
		Access:   accessTTL,
		Refresh:  refreshTTL,
	}
}

func WantsCookieSession(r *http.Request) bool {
	return strings.EqualFold(strings.TrimSpace(r.Header.Get(ClientHeader)), ClientWeb)
}

func AccessTokenFromRequest(r *http.Request) (token string, fromCookie bool) {
	if r == nil {
		return "", false
	}
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):]), false
	}
	if c, err := r.Cookie(AccessCookieName); err == nil && c.Value != "" {
		return c.Value, true
	}
	return "", false
}

func RefreshTokenFromRequest(r *http.Request, bodyToken string) string {
	if strings.TrimSpace(bodyToken) != "" {
		return strings.TrimSpace(bodyToken)
	}
	if r == nil {
		return ""
	}
	if c, err := r.Cookie(RefreshCookieName); err == nil {
		return c.Value
	}
	return ""
}

func SetAuthCookies(w http.ResponseWriter, cfg CookieConfig, access, refresh string) {
	if access != "" {
		http.SetCookie(w, cfg.cookie(AccessCookieName, access, cfg.Access, "/"))
	}
	if refresh != "" {
		http.SetCookie(w, cfg.cookie(RefreshCookieName, refresh, cfg.Refresh, "/api/v1/auth"))
	}
}

func ClearAuthCookies(w http.ResponseWriter, cfg CookieConfig) {
	http.SetCookie(w, cfg.cookie(AccessCookieName, "", -1, "/"))
	http.SetCookie(w, cfg.cookie(RefreshCookieName, "", -1, "/api/v1/auth"))
}

func (c CookieConfig) cookie(name, value string, ttl time.Duration, path string) *http.Cookie {
	maxAge := 0
	if ttl < 0 {
		maxAge = -1
	} else if ttl > 0 {
		maxAge = int(ttl.Seconds())
	}
	return &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     path,
		Domain:   c.Domain,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: c.SameSite,
	}
}
