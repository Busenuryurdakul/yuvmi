package dto

import (
	"time"

	"github.com/google/uuid"
)

// RegisterRequest is the input for user registration.
type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
}

// LoginRequest is the input for user login.
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// LoginResponse is the output for successful login.
type LoginResponse struct {
	Token        string   `json:"token"`
	RefreshToken string   `json:"refresh_token"`
	User         UserInfo `json:"user"`
}

// AuthTokenResponse is returned by login, oauth, and refresh endpoints.
type AuthTokenResponse = LoginResponse

// OAuthRequest is the input for OAuth login.
type OAuthRequest struct {
	Provider  string `json:"provider" validate:"required,oneof=google apple"`
	IDToken   string `json:"id_token" validate:"required"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// RefreshRequest is the input for token refresh.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// LogoutRequest revokes the current refresh token for the authenticated user.
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ForgotPasswordRequest starts a password reset flow.
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest completes a password reset flow.
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// DeleteAccountRequest confirms account deletion.
type DeleteAccountRequest struct {
	Password string `json:"password"`
}

// UserInfo is a public user representation.
type UserInfo struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// AssignRoleRequest is the input for assigning a role to a user.
type AssignRoleRequest struct {
	UserID         uuid.UUID  `json:"user_id" validate:"required"`
	RoleID         uuid.UUID  `json:"role_id" validate:"required"`
	OrganizationID uuid.UUID  `json:"organization_id" validate:"required"`
	AppID          *uuid.UUID `json:"app_id,omitempty"`
}

// UpdateUserRequest is the input for updating a user.
type UpdateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Status    string `json:"status"`
}
