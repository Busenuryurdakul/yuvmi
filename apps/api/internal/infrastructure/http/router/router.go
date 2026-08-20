package router

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"

	// Handlers
	apimgmtHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/apimanagement"
	auditHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/audit"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/health"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	realtimeHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/realtime"
	tenantHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/tenant"
	waitlistHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/waitlist"
	yuvmiHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/yuvmi"

	// Services & middleware
	iamService "github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/gateway"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"

	// Repositories (for tenant resolver middleware)
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

func maybeRequirePermission(rbac iamService.RBACService, permission string) func(http.Handler) http.Handler {
	if rbac == nil {
		return func(next http.Handler) http.Handler { return next }
	}
	return middleware.RequirePermission(rbac, permission)
}

// Dependencies holds all injected dependencies for the router.
type Dependencies struct {
	Logger *slog.Logger
	DB     *pgxpool.Pool
	Redis  *redis.Client

	CORSAllowedOrigins []string
	MaxBodyBytes       int64
	WaitlistConfig     config.WaitlistConfig

	// Services
	AuthService iamService.AuthService
	RBACService iamService.RBACService

	// Handlers
	IAMHandler      *iamHandler.Handler
	TenantHandler   *tenantHandler.Handler
	APIMgmtHandler  *apimgmtHandler.Handler
	AuditHandler    *auditHandler.Handler
	RealtimeHandler *realtimeHandler.Handler
	YuvmiHandler    *yuvmiHandler.Handler
	WaitlistHandler *waitlistHandler.Handler

	// Gateway
	GatewayPipeline *gateway.Pipeline

	// Repos needed for middleware
	OrgRepo       tenantRepo.OrgRepository
	WorkspaceRepo tenantRepo.WorkspaceRepository
}

// New creates the root Chi router with all middleware and routes.
func New(deps Dependencies) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.Logging(deps.Logger))
	r.Use(middleware.Recoverer(deps.Logger))
	if deps.MaxBodyBytes > 0 {
		r.Use(middleware.MaxBodyBytes(deps.MaxBodyBytes))
	}
	r.Use(cors.Handler(middleware.CORSOptions(deps.CORSAllowedOrigins)))

	// Health endpoints
	healthHandler := health.NewHandler(deps.DB, deps.Redis)
	r.Get("/health/live", healthHandler.Liveness)
	r.Get("/health/ready", healthHandler.Readiness)

	// Prometheus metrics
	r.Handle("/metrics", promhttp.Handler())

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public auth routes (no JWT required)
		r.Route("/auth", func(r chi.Router) {
			if deps.IAMHandler != nil {
				r.Post("/register", deps.IAMHandler.Register)
				r.Post("/login", deps.IAMHandler.Login)
				r.Post("/oauth", deps.IAMHandler.OAuthLogin)
				r.Post("/refresh", deps.IAMHandler.RefreshToken)
				r.Post("/forgot-password", deps.IAMHandler.ForgotPassword)
				r.Post("/reset-password", deps.IAMHandler.ResetPassword)
			}
		})

		// Public product routes (no JWT required)
		r.Route("/public", func(r chi.Router) {
			if deps.WaitlistHandler != nil {
				r.With(
					middleware.MaxBodyBytes(dto.SignupMaxBodyBytes),
					middleware.WaitlistRateLimit(deps.Redis, deps.WaitlistConfig, deps.Logger),
				).Post("/waitlist", deps.WaitlistHandler.Signup)
			}
		})

		// Public Yuvmi webhook (no JWT)
		if deps.YuvmiHandler != nil {
			r.Post("/subscription/webhook/stripe", deps.YuvmiHandler.StripeWebhook)
		}

		// Yuvmi product routes (JWT only — no tenant/org headers required)
		r.Group(func(r chi.Router) {
			if deps.AuthService != nil {
				r.Use(middleware.JWTAuth(deps.AuthService))
			}
			if deps.IAMHandler != nil {
				r.Post("/auth/logout", deps.IAMHandler.Logout)
			}
			if deps.YuvmiHandler != nil {
				r.Get("/me", deps.YuvmiHandler.GetMe)
				r.Patch("/me", deps.YuvmiHandler.UpdateMe)
				if deps.IAMHandler != nil {
					r.Delete("/me/account", deps.IAMHandler.DeleteAccount)
				}

				r.Route("/future-selfs", func(r chi.Router) {
					r.Post("/", deps.YuvmiHandler.CreateFutureSelf)
					r.Get("/me", deps.YuvmiHandler.GetFutureSelf)
					r.Put("/me", deps.YuvmiHandler.UpdateFutureSelf)
					r.Post("/me/approve", deps.YuvmiHandler.ApproveFutureSelf)
				})

				r.Route("/goals", func(r chi.Router) {
					r.Post("/", deps.YuvmiHandler.CreateGoal)
					r.Get("/active", deps.YuvmiHandler.GetActiveGoal)
				})

				r.Route("/plans", func(r chi.Router) {
					r.Post("/", deps.YuvmiHandler.CreatePlan)
					r.Get("/", deps.YuvmiHandler.ListPlans)
					r.Post("/revise", deps.YuvmiHandler.RevisePlan)
					r.Get("/active", deps.YuvmiHandler.GetActivePlan)
					r.Get("/{fromId}/diff/{toId}", deps.YuvmiHandler.GetPlanDiff)
					r.Get("/{id}", deps.YuvmiHandler.GetPlan)
					r.Post("/{id}/activate", deps.YuvmiHandler.ActivatePlan)
				})

				r.Route("/weekly-reviews", func(r chi.Router) {
					r.Get("/current", deps.YuvmiHandler.GetCurrentWeeklyReview)
					r.Get("/", deps.YuvmiHandler.ListWeeklyReviews)
					r.Patch("/{id}", deps.YuvmiHandler.UpdateWeeklyReview)
					r.Post("/{id}/apply", deps.YuvmiHandler.ApplyWeeklyReview)
				})

				r.Route("/notifications", func(r chi.Router) {
					r.Post("/token", deps.YuvmiHandler.RegisterPushToken)
					r.Post("/test", deps.YuvmiHandler.SendTestPush)
					r.Get("/", deps.YuvmiHandler.ListNotifications)
					r.Get("/unread-count", deps.YuvmiHandler.GetUnreadNotificationCount)
					r.Post("/{id}/read", deps.YuvmiHandler.MarkNotificationRead)
				})

				r.Route("/tasks", func(r chi.Router) {
					r.Get("/today", deps.YuvmiHandler.GetTodayTask)
					r.Post("/{id}/complete", deps.YuvmiHandler.CompleteTask)
					r.Post("/{id}/skip", deps.YuvmiHandler.SkipTask)
				})

				r.Route("/checkins", func(r chi.Router) {
					r.Get("/today", deps.YuvmiHandler.GetTodayCheckin)
					r.Put("/today", deps.YuvmiHandler.UpsertCheckin)
				})

				r.Route("/alignment", func(r chi.Router) {
					r.Get("/today", deps.YuvmiHandler.GetTodayAlignment)
					r.Get("/history", deps.YuvmiHandler.GetAlignmentHistory)
				})

				r.Route("/spaces", func(r chi.Router) {
					r.Get("/", deps.YuvmiHandler.ListSpaces)
					r.Post("/", deps.YuvmiHandler.CreateSpace)
					r.Get("/invites/pending", deps.YuvmiHandler.ListPendingSpaceInvites)
					r.Post("/invites/{id}/accept", deps.YuvmiHandler.AcceptSpaceInvite)
					r.Post("/invites/{id}/decline", deps.YuvmiHandler.DeclineSpaceInvite)
					r.Get("/{id}/assets", deps.YuvmiHandler.ListSpaceAssets)
					r.Get("/{id}", deps.YuvmiHandler.GetSpace)
					r.Post("/{id}/invites", deps.YuvmiHandler.CreateSpaceInvite)
					r.Post("/{id}/leave", deps.YuvmiHandler.LeaveSpace)
				})

				r.Route("/assets", func(r chi.Router) {
					r.Get("/", deps.YuvmiHandler.ListMyAssets)
					r.Post("/upload", deps.YuvmiHandler.UploadAsset)
					r.Get("/{id}/content", deps.YuvmiHandler.GetAssetContent)
					r.Get("/{id}", deps.YuvmiHandler.GetAsset)
					r.Patch("/{id}/share", deps.YuvmiHandler.ShareAsset)
					r.Post("/{id}/revoke-from-space", deps.YuvmiHandler.RevokeAssetFromSpace)
				})

				r.Route("/subscription", func(r chi.Router) {
					r.Get("/", deps.YuvmiHandler.GetSubscription)
					r.Post("/checkout", deps.YuvmiHandler.CreateSubscriptionCheckout)
					r.Post("/cancel", deps.YuvmiHandler.CancelSubscription)
					r.Post("/dev-upgrade", deps.YuvmiHandler.DevUpgradeSubscription)
				})

				r.Get("/export", deps.YuvmiHandler.ExportUserData)
			}
		})

		// Protected routes (require JWT)
		r.Group(func(r chi.Router) {
			if deps.AuthService != nil {
				r.Use(middleware.JWTAuth(deps.AuthService))
			}

			// Tenant resolution middleware (with workspace support)
			if deps.OrgRepo != nil {
				// Note: WorkspaceRepo can be nil - workspace resolution is optional
				r.Use(middleware.TenantResolverWithWorkspace(deps.OrgRepo, deps.WorkspaceRepo))
			}

			// WebSocket endpoint (before gateway pipeline — upgrade requests are not HTTP proxy)
			if deps.RealtimeHandler != nil {
				r.Get("/ws", deps.RealtimeHandler.Connect)
			}
		})

		r.Group(func(r chi.Router) {
			if deps.AuthService != nil {
				r.Use(middleware.JWTAuth(deps.AuthService))
			}

			if deps.OrgRepo != nil {
				r.Use(middleware.TenantResolverWithWorkspace(deps.OrgRepo, deps.WorkspaceRepo))
			}

			// Gateway pipeline (rate limiting, permission enforcement for managed endpoints)
			// Must be applied before specific routes so it can handle dynamic endpoints
			if deps.GatewayPipeline != nil {
				r.Use(deps.GatewayPipeline.Enforce)
			}

			// User routes (masterfabric IAM)
			if deps.IAMHandler != nil {
				r.With(maybeRequirePermission(deps.RBACService, "user:read")).Route("/users", func(r chi.Router) {
					r.Get("/", deps.IAMHandler.ListUsers)
					r.Get("/{id}", deps.IAMHandler.GetUser)
				})
				r.With(maybeRequirePermission(deps.RBACService, "user:write")).Post("/roles/assign", deps.IAMHandler.AssignRole)
			}

			// Organization routes
			if deps.TenantHandler != nil {
				r.Route("/organizations", func(r chi.Router) {
					r.With(maybeRequirePermission(deps.RBACService, "org:write")).Post("/", deps.TenantHandler.CreateOrg)
					r.With(maybeRequirePermission(deps.RBACService, "org:read")).Get("/", deps.TenantHandler.ListOrgs)
					r.Route("/{orgId}", func(r chi.Router) {
						r.With(maybeRequirePermission(deps.RBACService, "org:read")).Get("/", deps.TenantHandler.GetOrg)

						// Apps under organization
						r.Route("/apps", func(r chi.Router) {
							r.With(maybeRequirePermission(deps.RBACService, "app:write")).Post("/", deps.TenantHandler.CreateApp)
							r.With(maybeRequirePermission(deps.RBACService, "app:read")).Get("/", deps.TenantHandler.ListApps)
							r.Route("/{appId}", func(r chi.Router) {
								r.With(maybeRequirePermission(deps.RBACService, "app:read")).Get("/", deps.TenantHandler.GetApp)

								// API keys under app
								r.Route("/keys", func(r chi.Router) {
									r.With(maybeRequirePermission(deps.RBACService, "app:write")).Post("/", deps.TenantHandler.CreateAPIKey)
									r.With(maybeRequirePermission(deps.RBACService, "app:read")).Get("/", deps.TenantHandler.ListAPIKeys)
									r.With(maybeRequirePermission(deps.RBACService, "app:write")).Delete("/{keyId}", deps.TenantHandler.RevokeAPIKey)
								})

								// Endpoints under app
								if deps.APIMgmtHandler != nil {
									r.Route("/endpoints", func(r chi.Router) {
										r.With(maybeRequirePermission(deps.RBACService, "endpoint:write")).Post("/", deps.APIMgmtHandler.DefineEndpoint)
										r.With(maybeRequirePermission(deps.RBACService, "endpoint:read")).Get("/", deps.APIMgmtHandler.ListEndpoints)
										r.Route("/{endpointId}", func(r chi.Router) {
											r.With(maybeRequirePermission(deps.RBACService, "endpoint:read")).Get("/", deps.APIMgmtHandler.GetEndpoint)
											r.With(maybeRequirePermission(deps.RBACService, "endpoint:write")).Post("/retire", deps.APIMgmtHandler.RetireEndpoint)
											r.With(maybeRequirePermission(deps.RBACService, "endpoint:write")).Post("/activate", deps.APIMgmtHandler.ActivateEndpoint)
											r.With(maybeRequirePermission(deps.RBACService, "endpoint:write")).Put("/policy", deps.APIMgmtHandler.UpdatePolicy)
											r.With(maybeRequirePermission(deps.RBACService, "endpoint:read")).Get("/policy", deps.APIMgmtHandler.GetPolicy)
										})
									})
								}
							})
						})

						// Workspaces under organization
						r.Route("/workspaces", func(r chi.Router) {
							r.With(maybeRequirePermission(deps.RBACService, "org:write")).Post("/", deps.TenantHandler.CreateWorkspace)
							r.With(maybeRequirePermission(deps.RBACService, "org:read")).Get("/", deps.TenantHandler.ListWorkspaces)
							r.Route("/{workspaceId}", func(r chi.Router) {
								r.With(maybeRequirePermission(deps.RBACService, "org:write")).Put("/", deps.TenantHandler.UpdateWorkspace)
							})
						})

						// Audit logs under organization
						if deps.AuditHandler != nil {
							r.With(maybeRequirePermission(deps.RBACService, "org:read")).Get("/audit-logs", deps.AuditHandler.ListByOrg)
						}
					})
				})
			}

			// Audit logs by user
			if deps.AuditHandler != nil {
				r.With(maybeRequirePermission(deps.RBACService, "org:read")).Get("/users/{userId}/audit-logs", deps.AuditHandler.ListByUser)
			}

			// Catch-all handler for managed endpoints (must be last in the group)
			// This allows the gateway pipeline to handle dynamic endpoints like /api/v1/products
			// The gateway middleware will validate and return responses for managed endpoints
			r.HandleFunc("/*", func(w http.ResponseWriter, r *http.Request) {
				// Gateway middleware should have already handled this if it's a managed endpoint
				// If we reach here, it means no endpoint was found, return 404
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusNotFound)
				_, _ = w.Write([]byte(`{"error":"endpoint not found","code":404,"message":"No endpoint registered for this path. Define the endpoint first using POST /api/v1/organizations/{orgId}/apps/{appId}/endpoints"}`))
			})
		})
	})

	// Catch-all handler for managed endpoints (must be after all specific routes)
	// This allows the gateway pipeline to handle dynamic endpoints like /api/v1/products
	// The gateway middleware will validate and return responses for managed endpoints
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		// If this is an API v1 path, let the gateway handle it (if it hasn't already)
		// Otherwise return 404
		if !strings.HasPrefix(r.URL.Path, "/api/v1") {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_, _ = w.Write([]byte(`{"error":"not found","code":404}`))
			return
		}

		// For /api/v1 paths, check if gateway pipeline already handled it
		// If not, return 404 (gateway would have returned response if endpoint existed)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"error":"endpoint not found","code":404,"message":"No endpoint registered for this path. Define the endpoint first."}`))
	})

	return r
}
