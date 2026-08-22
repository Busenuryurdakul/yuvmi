package iam

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/dto"
	"github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/masterfabric-go/masterfabric/internal/shared/pagination"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/masterfabric-go/masterfabric/internal/shared/validator"

	iamRepo "github.com/masterfabric-go/masterfabric/internal/domain/iam/repository"
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
	changePasswordUC *usecase.ChangePasswordUseCase
	logoutUC         *usecase.LogoutUseCase
	assignRoleUC     *usecase.AssignRoleUseCase
	userRepo         iamRepo.UserRepository
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
	changePasswordUC *usecase.ChangePasswordUseCase,
	logoutUC *usecase.LogoutUseCase,
	assignRoleUC *usecase.AssignRoleUseCase,
	userRepo iamRepo.UserRepository,
) *Handler {
	return &Handler{
		registerUC:       registerUC,
		loginUC:          loginUC,
		oauthUC:          oauthUC,
		refreshUC:        refreshUC,
		forgotPasswordUC: forgotPasswordUC,
		resetPasswordUC:  resetPasswordUC,
		deleteAccountUC:  deleteAccountUC,
		changePasswordUC: changePasswordUC,
		logoutUC:         logoutUC,
		assignRoleUC:     assignRoleUC,
		userRepo:         userRepo,
	}
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

	response.JSON(w, http.StatusOK, result)
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

	response.JSON(w, http.StatusOK, result)
}

// RefreshToken issues a new access token from a refresh token.
func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	result, err := h.refreshUC.Execute(r.Context(), req)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, result)
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

// ChangePassword updates the authenticated user's password and revokes all refresh tokens.
func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	var req dto.ChangePasswordRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.changePasswordUC.Execute(r.Context(), userID, req); err != nil {
		response.Error(w, err)
		return
	}

	response.NoContent(w)
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

	response.NoContent(w)
}

// Logout revokes the refresh token supplied by the authenticated user.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.UserIDFromContext(r.Context())
	if !ok {
		response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "not authenticated"})
		return
	}

	var req dto.LogoutRequest
	if err := validator.DecodeAndValidate(r, &req); err != nil {
		response.JSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := h.logoutUC.Execute(r.Context(), userID, req); err != nil {
		response.Error(w, err)
		return
	}

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

	response.JSON(w, http.StatusOK, dto.UserInfo{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Status:    string(user.Status),
		CreatedAt: user.CreatedAt,
	})
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

	response.JSON(w, http.StatusOK, dto.UserInfo{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Status:    string(user.Status),
		CreatedAt: user.CreatedAt,
	})
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
		infos = append(infos, dto.UserInfo{
			ID:        u.ID,
			Email:     u.Email,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Status:    string(u.Status),
			CreatedAt: u.CreatedAt,
		})
	}

	response.JSON(w, http.StatusOK, pagination.NewResult(infos, params, total))
}
