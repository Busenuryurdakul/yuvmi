package service

import (
	"context"

	"github.com/google/uuid"
)

// TokenClaims represents the contents of a JWT token.
type TokenClaims struct {
	UserID         uuid.UUID `json:"user_id"`
	Email          string    `json:"email"`
	OrganizationID uuid.UUID `json:"organization_id,omitempty"`
	Roles          []string  `json:"roles,omitempty"`
	Permissions    []string  `json:"permissions,omitempty"`
}

// TokenPair holds access and refresh tokens issued on login.
type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

// AuthService defines authentication operations.
type AuthService interface {
	// HashPassword hashes a plaintext password.
	HashPassword(password string) (string, error)
	// VerifyPassword checks a plaintext password against a hash.
	VerifyPassword(hashedPassword, password string) error
	// GenerateToken creates a JWT access token from claims.
	GenerateToken(ctx context.Context, claims TokenClaims) (string, error)
	// ValidateToken validates a JWT token and returns its claims.
	ValidateToken(ctx context.Context, token string) (*TokenClaims, error)
	// GenerateRefreshToken creates a random refresh token string.
	GenerateRefreshToken() (string, error)
	// HashRefreshToken returns a SHA-256 hex hash of a refresh token.
	HashRefreshToken(token string) string
}
