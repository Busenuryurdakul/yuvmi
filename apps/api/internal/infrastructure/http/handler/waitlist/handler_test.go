package waitlist_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/waitlist/model"
	waitlistRepo "github.com/masterfabric-go/masterfabric/internal/domain/waitlist/repository"
	waitlistHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/waitlist"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type handlerMockRepo struct {
	result waitlistRepo.RegisterResult
	err    error
}

func (m *handlerMockRepo) Register(_ context.Context, _ *model.Signup) (waitlistRepo.RegisterResult, error) {
	return m.result, m.err
}

func newHandler(repo waitlistRepo.SignupRepository) *waitlistHandler.Handler {
	return waitlistHandler.NewHandler(usecase.NewSignupUseCase(repo, config.WaitlistConfig{
		PrivacyPolicyVersion: "test-v1",
	}))
}

func postSignup(t *testing.T, handler http.HandlerFunc, body string, authHeader string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	rec := httptest.NewRecorder()
	handler(rec, req)
	return rec
}

func decodeSignupResponse(t *testing.T, rec *httptest.ResponseRecorder) dto.SignupResponse {
	t.Helper()
	var payload dto.SignupResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &payload))
	return payload
}

func assertUniformAccepted(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int) {
	t.Helper()
	assert.Equal(t, wantStatus, rec.Code)
	payload := decodeSignupResponse(t, rec)
	assert.Equal(t, dto.SignupStatusAccepted, payload.Status)
	assert.Equal(t, dto.SignupSuccessMessage, payload.Message)
}

func TestHandler_ValidRequestReturns201Created(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: true}})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}`, "")

	assertUniformAccepted(t, rec, http.StatusCreated)
	assert.NotContains(t, rec.Body.String(), "user@example.com")
}

func TestHandler_InvalidEmail422(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{"email":"not-an-email","consent":true}`, "")

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
	assert.Contains(t, rec.Body.String(), "error")
	assert.NotContains(t, rec.Body.String(), "not-an-email")
}

func TestHandler_ConsentFalse422(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":false}`, "")

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
}

func TestHandler_TrimsEmailBeforeValidation(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: false}})

	rec := postSignup(t, h.Signup, `{"email":"  user@example.com  ","consent":true}`, "")

	assertUniformAccepted(t, rec, http.StatusOK)
}

func TestHandler_MalformedJSON(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{`, "")

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "error")
}

func TestHandler_NoAuthorizationAccessible(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: true}})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}`, "")

	assertUniformAccepted(t, rec, http.StatusCreated)
}

func TestHandler_DuplicateReturnsSame200Accepted(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: false}})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}`, "")

	assertUniformAccepted(t, rec, http.StatusOK)
}

func TestHandler_DuplicateBodyMatchesCreated(t *testing.T) {
	created := postSignup(t, newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: true}}).Signup, `{"email":"user@example.com","consent":true}`, "")
	duplicate := postSignup(t, newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: false}}).Signup, `{"email":"user@example.com","consent":true}`, "")

	assert.Equal(t, http.StatusCreated, created.Code)
	assert.Equal(t, http.StatusOK, duplicate.Code)
	assert.Equal(t, created.Body.String(), duplicate.Body.String())
}

func TestHandler_ResponseDoesNotExposeEmailOrID(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: true}})

	rec := postSignup(t, h.Signup, `{"email":"secret@example.com","consent":true}`, "")

	body := rec.Body.String()
	assert.NotContains(t, body, "secret@example.com")
	assert.NotContains(t, body, `"id"`)
}

func TestHandler_InternalError(t *testing.T) {
	h := newHandler(&handlerMockRepo{err: domainErr.New(domainErr.ErrInternal, "db down", nil)})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}`, "")

	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.NotContains(t, rec.Body.String(), "user@example.com")
}

func TestHandler_MissingConsentField422(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com"}`, "")

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
}

func TestHandler_UnknownFieldRejected(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true,"extra":1}`, "")

	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandler_TrailingJSONRejected(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}{}`, "")

	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandler_EmptyBodyRejected(t *testing.T) {
	h := newHandler(&handlerMockRepo{})

	rec := postSignup(t, h.Signup, ``, "")

	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func assertNoSensitiveFields(t *testing.T, body []byte) {
	t.Helper()
	var raw map[string]any
	require.NoError(t, json.Unmarshal(body, &raw))
	_, hasEmail := raw["email"]
	_, hasID := raw["id"]
	assert.False(t, hasEmail)
	assert.False(t, hasID)
}

func TestHandler_ResponseShape(t *testing.T) {
	h := newHandler(&handlerMockRepo{result: waitlistRepo.RegisterResult{Created: true}})
	rec := postSignup(t, h.Signup, `{"email":"user@example.com","consent":true}`, "")
	assertNoSensitiveFields(t, rec.Body.Bytes())
}

func TestHandler_EmailTooLong422(t *testing.T) {
	h := newHandler(&handlerMockRepo{})
	longLocal := strings.Repeat("a", 309) + "@example.com"
	require.Greater(t, len(longLocal), dto.SignupMaxEmailLength)
	body, err := json.Marshal(map[string]any{"email": longLocal, "consent": true})
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Signup(rec, req)

	assert.Equal(t, http.StatusUnprocessableEntity, rec.Code)
}
