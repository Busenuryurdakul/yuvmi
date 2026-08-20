package iam

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/pagination"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"
)

// Handler provides IAM HTTP handlers.
type Handler struct {
	registerUC       *usecase.RegisterUseCase
	loginUC          *usecase.LoginUseCase
	oauthUC          *usecase.OAuthLoginUseCase
	refreshUC        *usecase.RefreshTokenUseCase
	forgotPasswordUC *usecase.ForgotPasswordUseCase
	resetPasswordUC  *usecase.ResetPasswordUseCase
	deleteAccountUC  *usecase.DeleteAccountUseCase
	assignRoleUC     *usecase.AssignRoleUseCase
	verifyEmailUC    *usecase.VerifyEmailUseCase
	resendVerifyUC   *usecase.ResendVerificationUseCase
	userRepo         repository.UserRepository
	refreshRepo      *pgIam.RefreshTokenRepo
	auth             service.AuthService
	cookies          infraAuth.CookieConfig
	allowedOrigins   []string
}

// NewHandler creates a new IAM handler.
func NewHandler(
	registerUC *usecase.RegisterUseCase,
	loginUC *usecase.LoginUseCase,
	oauthUC *usecase.OAuthLoginUseCase,
	refreshUC *usecase.RefreshTokenUseCase,
	forgotPasswordUC *usecase.ForgotPasswordUseCase,
	resetPasswordUC *usecase.ResetPasswordUseCase,
	deleteAccountUC *usecase.DeleteAccountUseCase,
	assignRoleUC *usecase.AssignRoleUseCase,
	verifyEmailUC *usecase.VerifyEmailUseCase,
	resendVerifyUC *usecase.ResendVerificationUseCase,
	userRepo repository.UserRepository,
	refreshRepo *pgIam.RefreshTokenRepo,
	auth service.AuthService,
	cookies infraAuth.CookieConfig,
	allowedOrigins []string,
) *Handler {
	return &Handler{
		registerUC:       registerUC,
		loginUC:          loginUC,
		oauthUC:          oauthUC,
		refreshUC:        refreshUC,
		forgotPasswordUC: forgotPasswordUC,
		resetPasswordUC:  resetPasswordUC,
		deleteAccountUC:  deleteAccountUC,
		assignRoleUC:     assignRoleUC,
		verifyEmailUC:    verifyEmailUC,
		resendVerifyUC:   resendVerifyUC,
		userRepo:         userRepo,
		refreshRepo:      refreshRepo,
		auth:             auth,
		cookies:          cookies,
		allowedOrigins:   allowedOrigins,
	}
}

func toUserInfo(user *model.User) dto.UserInfo {
	return dto.UserInfo{
		ID:            user.ID,
		Email:         user.Email,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		EmailVerified: user.EmailVerified,
		Status:        string(user.Status),
		CreatedAt:     user.CreatedAt,
	}
}

func (h *Handler) writeAuthSession(w http.ResponseWriter, r *http.Request, result *dto.AuthTokenResponse) {
	if result != nil {
		infraAuth.SetAuthCookies(w, h.cookies, result.Token, result.RefreshToken)
		if omitTokensInBody(r) {
			stripped := *result
			stripped.Token = ""
			stripped.RefreshToken = ""
			response.JSON(w, http.StatusOK, stripped)
			return
		}
	}
	response.JSON(w, http.StatusOK, result)
}

func omitTokensInBody(r *http.Request) bool {
	if infraAuth.WantsCookieSession(r) {
		return true
	}
	if _, err := r.Cookie(infraAuth.AccessCookieName); err == nil {
		return true
	}
	_, err := r.Cookie(infraAuth.RefreshCookieName)
	return err == nil
}

func decodeJSONOptional(r *http.Request, target interface{}) error {
	if r.Body == nil {
		return nil
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(target); err != nil {
		if err == io.EOF {
			return nil
		}
		return err
	}
	return nil
}

// Register handles user registration.
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	user, err := h.registerUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.Created(w, user)
}

// Login handles user authentication.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.loginUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	h.writeAuthSession(w, r, result)
}

// OAuthLogin handles Google/Apple OAuth sign-in.
func (h *Handler) OAuthLogin(w http.ResponseWriter, r *http.Request) {
	var req dto.OAuthRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.oauthUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	h.writeAuthSession(w, r, result)
}

// RefreshToken issues a new access token from a refresh token.
func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	if err := decodeJSONOptional(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	bodyToken := req.RefreshToken
	req.RefreshToken = infraAuth.RefreshTokenFromRequest(r, req.RefreshToken)
	if req.RefreshToken == "" {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "refresh token is required"})
		return
	}
	if bodyToken == "" && !middleware.OriginAllowed(r, h.allowedOrigins) {
		response.JSON(w, http.StatusForbidden, map[string]string{"error": "invalid request origin"})
		return
	}

	result, err := h.refreshUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	h.writeAuthSession(w, r, result)
}

// Logout revokes the refresh token and clears auth cookies.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	_ = decodeJSONOptional(r, &req)
	bodyToken := strings.TrimSpace(req.RefreshToken)
	token := infraAuth.RefreshTokenFromRequest(r, req.RefreshToken)
	if bodyToken == "" && token != "" && !middleware.OriginAllowed(r, h.allowedOrigins) {
		response.JSON(w, http.StatusForbidden, map[string]string{"error": "invalid request origin"})
		return
	}
	if token != "" && h.refreshRepo != nil && h.auth != nil {
		_ = h.refreshRepo.Revoke(r.Context(), h.auth.HashRefreshToken(token))
	}
	infraAuth.ClearAuthCookies(w, h.cookies)
	response.NoContent(w)
}

// VerifyEmail marks the account email as verified.
func (h *Handler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req dto.VerifyEmailRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if h.verifyEmailUC == nil {
		response.JSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
		return
	}
	if err := h.verifyEmailUC.Execute(r.Context(), req); err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Email verified."})
}

// ResendVerification sends a new verification email.
func (h *Handler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req dto.ResendVerificationRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if h.resendVerifyUC == nil {
		response.JSON(w, http.StatusNotImplemented, map[string]string{"error": "not implemented"})
		return
	}
	if err := h.resendVerifyUC.Execute(r.Context(), req); err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "If the email exists, a verification link was sent."})
}

// ForgotPassword initiates password reset.
func (h *Handler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ForgotPasswordRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.forgotPasswordUC.Execute(r.Context(), req); err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "If the email exists, a reset link was sent."})
}

// ResetPassword completes password reset.
func (h *Handler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req dto.ResetPasswordRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.resetPasswordUC.Execute(r.Context(), req); err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{"message": "Password updated."})
}

// DeleteAccount permanently removes the authenticated user's account.
func (h *Handler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	var req dto.DeleteAccountRequest
	_ = validator.DecodeAndValidate(r, &req)

	if err := h.deleteAccountUC.Execute(r.Context(), userID, req); err != nil {
		response.Error(w, err)
		return
	}

	infraAuth.ClearAuthCookies(w, h.cookies)
	response.NoContent(w)
}

// AssignRole handles role assignment.
func (h *Handler) AssignRole(w http.ResponseWriter, r *http.Request) {
	var req dto.AssignRoleRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.assignRoleUC.Execute(r.Context(), req); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
}

// GetMe returns the current authenticated user.
func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), userID)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, toUserInfo(user))
}

// GetUser returns a user by ID.
func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": "invalid user id"})
		return
	}

	user, err := h.userRepo.GetByID(r.Context(), id)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, toUserInfo(user))
}

// ListUsers returns a paginated list of users.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	params := pagination.FromRequest(r)

	users, total, err := h.userRepo.List(r.Context(), params.Offset(), params.Limit())
	if err != nil {
		response.Error(w, err)
		return
	}

	var infos []dto.UserInfo
	for _, u := range users {
		infos = append(infos, toUserInfo(u))
	}

	response.JSON(w, http.StatusOK, pagination.NewResult(infos, params, total))
}
