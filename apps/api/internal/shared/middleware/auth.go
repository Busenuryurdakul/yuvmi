package middleware

import (
	"context"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/shared/logger"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
)

type contextKey string

const (
	ContextKeyUserID         contextKey = "auth_user_id"
	ContextKeyEmail          contextKey = "auth_email"
	ContextKeyOrganizationID contextKey = "auth_organization_id"
	ContextKeyPermissions    contextKey = "auth_permissions"
	ContextKeyClaims         contextKey = "auth_claims"
)

// JWTAuth is middleware that validates JWT tokens and injects claims into context.
// Access tokens may come from Authorization: Bearer (mobile) or an HttpOnly cookie (web).
// Cookie-authenticated mutating requests must present an Origin on the CORS allow-list.
// A nil AuthService is treated as unauthenticated (fail closed).
func JWTAuth(authService service.AuthService, allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if authService == nil {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
				return
			}

			token, fromCookie := bearerOrCookie(r)
			if token == "" {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "missing authorization header"})
				return
			}

			if fromCookie && !isSafeMethod(r.Method) && !OriginAllowed(r, allowedOrigins) {
				response.JSON(w, http.StatusForbidden, map[string]string{"error": "invalid request origin"})
				return
			}

			claims, err := authService.ValidateToken(r.Context(), token)
			if err != nil {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
				return
			}

			ctx := r.Context()
			ctx = context.WithValue(ctx, ContextKeyClaims, claims)
			ctx = context.WithValue(ctx, ContextKeyUserID, claims.UserID)
			ctx = context.WithValue(ctx, ContextKeyEmail, claims.Email)
			ctx = context.WithValue(ctx, ContextKeyOrganizationID, claims.OrganizationID)
			ctx = context.WithValue(ctx, ContextKeyPermissions, claims.Permissions)

			ctx = logger.ContextWithUserID(ctx, claims.UserID.String())
			if claims.OrganizationID != uuid.Nil {
				ctx = logger.ContextWithOrganizationID(ctx, claims.OrganizationID.String())
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func bearerOrCookie(r *http.Request) (token string, fromCookie bool) {
	header := r.Header.Get("Authorization")
	const prefix = "Bearer "
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return strings.TrimSpace(header[len(prefix):]), false
	}
	if c, err := r.Cookie("yuvmi_access"); err == nil && c.Value != "" {
		return c.Value, true
	}
	return "", false
}

func isSafeMethod(method string) bool {
	switch strings.ToUpper(method) {
	case http.MethodGet, http.MethodHead, http.MethodOptions:
		return true
	default:
		return false
	}
}

func OriginAllowed(r *http.Request, origins []string) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		if ref := strings.TrimSpace(r.Header.Get("Referer")); ref != "" {
			if u, err := url.Parse(ref); err == nil {
				origin = u.Scheme + "://" + u.Host
			}
		}
	}
	if origin == "" {
		return false
	}
	for _, allowed := range origins {
		if allowed != "" && strings.EqualFold(allowed, origin) {
			return true
		}
	}
	return false
}

// RequirePermission is middleware that checks if the authenticated user has a specific permission.
func RequirePermission(rbac service.RBACService, permission string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := r.Context().Value(ContextKeyUserID).(uuid.UUID)
			if !ok {
				response.JSON(w, http.StatusUnauthorized, map[string]string{"error": "user not authenticated"})
				return
			}

			orgID, _ := r.Context().Value(ContextKeyOrganizationID).(uuid.UUID)

			has, err := rbac.HasPermission(r.Context(), userID, orgID, permission)
			if err != nil {
				response.JSON(w, http.StatusInternalServerError, map[string]string{"error": "permission check failed"})
				return
			}
			if !has {
				response.JSON(w, http.StatusForbidden, map[string]string{"error": "insufficient permissions"})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// UserIDFromContext extracts the authenticated user ID from the context.
func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ContextKeyUserID).(uuid.UUID)
	return id, ok
}

// OrgIDFromContext extracts the organization ID from the context.
func OrgIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(ContextKeyOrganizationID).(uuid.UUID)
	return id, ok
}
