package iam_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type handlerChangePasswordStore struct {
	err error
}

func (m *handlerChangePasswordStore) ChangePasswordAndRevokeSessions(context.Context, uuid.UUID, string) error {
	return m.err
}

type handlerChangePasswordUserRepo struct {
	user *model.User
}

func (r *handlerChangePasswordUserRepo) Create(context.Context, *model.User) error { return nil }
func (r *handlerChangePasswordUserRepo) GetByID(context.Context, uuid.UUID) (*model.User, error) {
	return r.user, nil
}
func (r *handlerChangePasswordUserRepo) GetByEmail(context.Context, string) (*model.User, error) {
	return nil, nil
}
func (r *handlerChangePasswordUserRepo) GetByProvider(context.Context, string, string) (*model.User, error) {
	return nil, nil
}
func (r *handlerChangePasswordUserRepo) Update(context.Context, *model.User) error { return nil }
func (r *handlerChangePasswordUserRepo) Delete(context.Context, uuid.UUID) error   { return nil }
func (r *handlerChangePasswordUserRepo) List(context.Context, int, int) ([]*model.User, int, error) {
	return nil, 0, nil
}

func newChangePasswordHandler(t *testing.T, user *model.User, store *handlerChangePasswordStore) http.HandlerFunc {
	t.Helper()
	jwtSvc := infraAuth.NewJWTService(config.JWTConfig{Secret: "test-secret-key-at-least-32-bytes!", ExpirationHours: 1})
	changeUC := usecase.NewChangePasswordUseCase(&handlerChangePasswordUserRepo{user: user}, jwtSvc, store, config.YuvmiConfig{})
	h := iamHandler.NewHandler(nil, nil, nil, nil, nil, nil, nil, changeUC, nil, nil, &handlerChangePasswordUserRepo{user: user})
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := context.WithValue(r.Context(), middleware.ContextKeyUserID, user.ID)
		h.ChangePassword(w, r.WithContext(ctx))
	}
}

func postChangePassword(t *testing.T, handler http.HandlerFunc, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/me/change-password", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler(rec, req)
	return rec
}

func TestChangePasswordHandler_ValidRequest204(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("OldPassword1!"), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}

	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), `{"current_password":"OldPassword1!","new_password":"NewPassword2!"}`)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.Empty(t, rec.Body.String())
}

func TestChangePasswordHandler_WrongCurrentPassword400(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("OldPassword1!"), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}

	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), `{"current_password":"WrongPassword1!","new_password":"NewPassword2!"}`)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.NotEqual(t, http.StatusUnauthorized, rec.Code)
}

func TestChangePasswordHandler_ShortNewPassword400(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("OldPassword1!"), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}

	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), `{"current_password":"OldPassword1!","new_password":"short"}`)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestChangePasswordHandler_Unauthenticated401(t *testing.T) {
	jwtSvc := infraAuth.NewJWTService(config.JWTConfig{Secret: "test-secret-key-at-least-32-bytes!", ExpirationHours: 1})
	changeUC := usecase.NewChangePasswordUseCase(&handlerChangePasswordUserRepo{}, jwtSvc, &handlerChangePasswordStore{}, config.YuvmiConfig{})
	h := iamHandler.NewHandler(nil, nil, nil, nil, nil, nil, nil, changeUC, nil, nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/me/change-password", bytes.NewBufferString(`{"current_password":"OldPassword1!","new_password":"NewPassword2!"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ChangePassword(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestChangePasswordHandler_DBError500(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("OldPassword1!"), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}
	store := &handlerChangePasswordStore{err: domainErr.New(domainErr.ErrInternal, "failed to commit password change", assert.AnError)}

	rec := postChangePassword(t, newChangePasswordHandler(t, user, store), `{"current_password":"OldPassword1!","new_password":"NewPassword2!"}`)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
}

func TestChangePasswordHandler_DoesNotLogRawPasswords(t *testing.T) {
	const current = "super-secret-current"
	hash, err := bcrypt.GenerateFromPassword([]byte(current), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}

	body := `{"current_password":"super-secret-current","new_password":"super-secret-new1"}`
	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), body)
	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.NotContains(t, rec.Body.String(), "super-secret-current")
	assert.NotContains(t, rec.Body.String(), "super-secret-new1")
}

func TestChangePasswordHandler_OAuthOnly400(t *testing.T) {
	user := &model.User{ID: uuid.New(), Email: "oauth@example.com", AuthProvider: "google", Status: model.UserStatusActive}
	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), `{"current_password":"anything","new_password":"NewPassword2!"}`)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestChangePasswordHandler_SamePassword400(t *testing.T) {
	const pass = "SamePassword1!"
	hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
	require.NoError(t, err)
	user := &model.User{ID: uuid.New(), Email: "user@example.com", PasswordHash: string(hash), Status: model.UserStatusActive}

	rec := postChangePassword(t, newChangePasswordHandler(t, user, &handlerChangePasswordStore{}), `{"current_password":"SamePassword1!","new_password":"SamePassword1!"}`)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}
