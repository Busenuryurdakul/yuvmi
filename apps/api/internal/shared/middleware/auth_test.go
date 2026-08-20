package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/stretchr/testify/require"
)

type stubTokenAuth struct {
	claims *service.TokenClaims
	err    error
}

func (s stubTokenAuth) HashPassword(string) (string, error) { return "", nil }
func (s stubTokenAuth) VerifyPassword(string, string) error { return nil }
func (s stubTokenAuth) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "", nil
}
func (s stubTokenAuth) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return s.claims, s.err
}
func (s stubTokenAuth) GenerateRefreshToken() (string, error) { return "", nil }
func (s stubTokenAuth) HashRefreshToken(string) string        { return "" }

func TestJWTAuth_NilServiceDenies(t *testing.T) {
	h := JWTAuth(nil, nil)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("handler must not run when AuthService is nil")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.Header.Set("Authorization", "Bearer leftover-token")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestJWTAuth_AcceptsCookie(t *testing.T) {
	userID := uuid.New()
	auth := stubTokenAuth{claims: &service.TokenClaims{UserID: userID, Email: "a@b.com"}}
	h := JWTAuth(auth, []string{"http://localhost:3000"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, ok := UserIDFromContext(r.Context())
		require.True(t, ok)
		require.Equal(t, userID, got)
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	req.AddCookie(&http.Cookie{Name: "yuvmi_access", Value: "cookie-token"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, http.StatusNoContent, rec.Code)
}

func TestJWTAuth_RejectsCookiePOSTWithoutOrigin(t *testing.T) {
	auth := stubTokenAuth{claims: &service.TokenClaims{UserID: uuid.New()}}
	h := JWTAuth(auth, []string{"http://localhost:3000"})(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/me", nil)
	req.AddCookie(&http.Cookie{Name: "yuvmi_access", Value: "cookie-token"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, http.StatusForbidden, rec.Code)
}

func TestOriginAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	require.True(t, OriginAllowed(req, []string{"http://localhost:3000"}))
	require.False(t, OriginAllowed(req, []string{"https://yuvmi.app"}))
}
