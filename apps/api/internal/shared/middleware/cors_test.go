package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/cors"
	"github.com/stretchr/testify/assert"
)

func TestCORSOptions_DisablesCredentialsForWildcard(t *testing.T) {
	opts := CORSOptions([]string{"*"})
	assert.False(t, opts.AllowCredentials)
	assert.False(t, opts.AllowOriginFunc(nil, "https://evil.example"))
}

func TestCORSOptions_DisablesCredentialsWhenEmpty(t *testing.T) {
	opts := CORSOptions(nil)
	assert.False(t, opts.AllowCredentials)
	assert.Empty(t, opts.AllowedOrigins)
	assert.False(t, opts.AllowOriginFunc(nil, "https://app.example.com"))
}

func TestCORSOptions_AllowsCredentialsForExplicitOrigins(t *testing.T) {
	opts := CORSOptions([]string{"https://app.example.com"})
	assert.True(t, opts.AllowCredentials)
	assert.True(t, opts.AllowOriginFunc(nil, "https://app.example.com"))
	assert.False(t, opts.AllowOriginFunc(nil, "https://yumvi.vercel.app"))
}

func TestCORS_AllowedOriginPreflightSucceeds(t *testing.T) {
	handler := cors.Handler(CORSOptions([]string{"https://app.example.com"}))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/public/waitlist", nil)
	req.Header.Set("Origin", "https://app.example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "https://app.example.com", rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_UnknownOriginOmitsCORSHeaders(t *testing.T) {
	handler := cors.Handler(CORSOptions([]string{"https://app.example.com"}))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Credentials"))
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Methods"))
}

func TestCORS_WildcardDoesNotAllowArbitraryOrigin(t *testing.T) {
	handler := cors.Handler(CORSOptions([]string{"*"}))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/public/waitlist", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_ProductionStyleHTTPOriginNotInAllowlist(t *testing.T) {
	handler := cors.Handler(CORSOptions([]string{"https://app.example.com"}))(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/public/waitlist", nil)
	req.Header.Set("Origin", "http://app.example.com")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}
