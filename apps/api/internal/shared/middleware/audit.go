package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/masterfabric-go/masterfabric/internal/domain/audit/model"
	"github.com/masterfabric-go/masterfabric/internal/domain/audit/repository"
)

func AuditLog(auditRepo repository.AuditRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID, _ := TenantIDFromContext(r.Context())
			userID, _ := UserIDFromContext(r.Context())
			method := r.Method
			path := r.URL.Path
			remoteAddr := r.RemoteAddr
			userAgent := r.UserAgent()

			wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)

			requestID := w.Header().Get(RequestIDHeader)

			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer cancel()

				var userIDPtr *uuid.UUID
				if userID != uuid.Nil {
					userIDPtr = &userID
				}

				entry := &model.AuditLog{
					OrganizationID: orgID,
					UserID:         userIDPtr,
					RequestID:      requestID,
					Action:         method + " " + path,
					ResourceType:   "http_request",
					ResourceID:     path,
					IPAddress:      remoteAddr,
					UserAgent:      userAgent,
				}

				_ = auditRepo.Create(ctx, entry)
			}()
		})
	}
}
