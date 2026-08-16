package router_test

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
	waitlistRepo "github.com/masterfabric-go/masterfabric/internal/domain/waitlist/repository"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	waitlistHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/waitlist"
	yuvmiHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/yuvmi"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/router"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type routeMockWaitlistRepo struct{}

func (routeMockWaitlistRepo) Register(_ context.Context, _ *model.Signup) (waitlistRepo.RegisterResult, error) {
	return waitlistRepo.RegisterResult{Created: true}, nil
}

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()

	jwtSvc := infraAuth.NewJWTService(config.JWTConfig{
		Secret:          "test-secret",
		ExpirationHours: 1,
		Issuer:          "test",
	})

	waitlistUC := usecase.NewSignupUseCase(routeMockWaitlistRepo{}, config.WaitlistConfig{
		PrivacyPolicyVersion: "test-v1",
		RateLimitRequests:    0,
	})

	return router.New(router.Dependencies{
		Logger:          slog.Default(),
		AuthService:     jwtSvc,
		YuvmiHandler:    yuvmiHandler.NewHandler(nil),
		WaitlistHandler: waitlistHandler.NewHandler(waitlistUC),
		WaitlistConfig: config.WaitlistConfig{
			RateLimitRequests: 0,
		},
	})
}

func TestWaitlistRoute_PublicNoJWT(t *testing.T) {
	r := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", strings.NewReader(`{"email":"user@example.com","consent":true}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusCreated, rec.Code)
	assert.Contains(t, rec.Body.String(), `"status":"`+dto.SignupStatusAccepted+`"`)
}

func TestProtectedRoute_MeRequiresJWT(t *testing.T) {
	r := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestWaitlistRoute_NotBehindGatewayCatchAll(t *testing.T) {
	r := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", strings.NewReader(`{"email":"user@example.com","consent":true}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	r.ServeHTTP(rec, req)

	require.NotEqual(t, http.StatusNotFound, rec.Code)
	assert.NotContains(t, rec.Body.String(), "endpoint not found")
}
