package iam_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type handlerLogoutRepo struct {
	calls []uuid.UUID
	err   error
}

func (m *handlerLogoutRepo) RevokeForUser(_ context.Context, userID uuid.UUID, _ string) error {
	m.calls = append(m.calls, userID)
	return m.err
}

type handlerAuthService struct {
	userID uuid.UUID
}

func (s *handlerAuthService) HashPassword(string) (string, error) { return "", nil }
func (s *handlerAuthService) VerifyPassword(string, string) error { return nil }
func (s *handlerAuthService) GenerateToken(context.Context, service.TokenClaims) (string, error) {
	return "access-token", nil
}
func (s *handlerAuthService) ValidateToken(context.Context, string) (*service.TokenClaims, error) {
	return &service.TokenClaims{UserID: s.userID, Email: "user@example.com"}, nil
}
func (s *handlerAuthService) GenerateRefreshToken() (string, error) { return "refresh-token", nil }
func (s *handlerAuthService) HashRefreshToken(token string) string  { return "hash-" + token }

func newLogoutHandler(userID uuid.UUID, repo *handlerLogoutRepo) http.HandlerFunc {
	auth := &handlerAuthService{userID: userID}
	logoutUC := usecase.NewLogoutUseCase(auth, repo)
	h := iamHandler.NewHandler(nil, nil, nil, nil, nil, nil, nil, logoutUC, nil, nil)
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), middleware.ContextKeyUserID, userID)
		h.Logout(w, r.WithContext(ctx))
	}
}

func postLogout(t *testing.T, handler http.HandlerFunc, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler(rec, req)
	return rec
}

func TestLogoutHandler_ValidRequest204(t *testing.T) {
	userID := uuid.New()
	repo := &handlerLogoutRepo{}
	rec := postLogout(t, newLogoutHandler(userID, repo), `{"refresh_token":"refresh-a"}`)

	assert.Equal(t, http.StatusNoContent, rec.Code)
	require.Len(t, repo.calls, 1)
	assert.Equal(t, userID, repo.calls[0])
}

func TestLogoutHandler_RepeatLogout204(t *testing.T) {
	userID := uuid.New()
	repo := &handlerLogoutRepo{}
	handler := newLogoutHandler(userID, repo)

	rec1 := postLogout(t, handler, `{"refresh_token":"refresh-a"}`)
	rec2 := postLogout(t, handler, `{"refresh_token":"refresh-a"}`)

	assert.Equal(t, http.StatusNoContent, rec1.Code)
	assert.Equal(t, http.StatusNoContent, rec2.Code)
}

func TestLogoutHandler_MissingRefreshToken400(t *testing.T) {
	rec := postLogout(t, newLogoutHandler(uuid.New(), &handlerLogoutRepo{}), `{}`)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestLogoutHandler_Unauthenticated401(t *testing.T) {
	auth := &handlerAuthService{userID: uuid.New()}
	logoutUC := usecase.NewLogoutUseCase(auth, &handlerLogoutRepo{})
	h := iamHandler.NewHandler(nil, nil, nil, nil, nil, nil, nil, logoutUC, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBufferString(`{"refresh_token":"refresh-a"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Logout(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestLogoutHandler_DBError500(t *testing.T) {
	repo := &handlerLogoutRepo{err: domainErr.New(domainErr.ErrInternal, "failed to revoke refresh token", assert.AnError)}
	rec := postLogout(t, newLogoutHandler(uuid.New(), repo), `{"refresh_token":"refresh-a"}`)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	assert.NotContains(t, rec.Body.String(), "refresh-a")
}

func TestLogoutHandler_DoesNotLogRawTokens(t *testing.T) {
	repo := &handlerLogoutRepo{}
	rec := postLogout(t, newLogoutHandler(uuid.New(), repo), `{"refresh_token":"super-secret-refresh-token"}`)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.NotContains(t, rec.Body.String(), "super-secret-refresh-token")
}
