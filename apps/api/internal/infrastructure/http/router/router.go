package router

import (
	"crypto/subtle"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"

	// Handlers
	apimgmtHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/apimanagement"
	auditHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/audit"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/health"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	realtimeHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/realtime"
	tenantHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/tenant"
	yuvmiHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/yuvmi"

	// Services & middleware
	iamService "github.com/masterfabric-go/masterfabric/internal/domain/iam/service"
	"github.com/masterfabric-go/masterfabric/internal/gateway"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"

	// Repositories (for tenant resolver middleware)
	tenantRepo "github.com/masterfabric-go/masterfabric/internal/domain/tenant/repository"
)

// maybeRequirePermission enforces the given permission. When RBAC is not
// configured, access is denied rather than silently allowed — an unconfigured
// authorization service must never fail open.
func maybeRequirePermission(rbac iamService.RBACService, permission string) func(http.Handler) http.Handler {
	if rbac == nil {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				writeNotFound(w)
			})
		}
	}
	return middleware.RequirePermission(rbac, permission)
}

// writeNotFound emits the single 404 body used for every unmatched route. It
// deliberately says nothing about which subsystems exist or how endpoints are
// registered.
func writeNotFound(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte(`{"error":"not found","code":404}`))
}

// bearerToken extracts the credential from an "Authorization: Bearer …" header.
func bearerToken(r *http.Request) string {
	const prefix = "Bearer "
	header := r.Header.Get("Authorization")
	if len(header) > len(prefix) && strings.EqualFold(header[:len(prefix)], prefix) {
		return header[len(prefix):]
	}
	return ""
}

// isInternalAddr reports whether an address belongs to loopback, private or
// link-local space.
func isInternalAddr(remoteAddr string) bool {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}
	ip := net.ParseIP(strings.Trim(host, "[]"))
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()
}

// internalOnly guards an operational endpoint that must never be public.
//
// When a token is configured the request has to present it as a bearer token —
// that is the only check that survives a reverse proxy, since behind one
// RemoteAddr reports the proxy rather than the caller. With no token the
// endpoint is reachable only from loopback and private ranges.
//
// Rejections return 404 rather than 401/403 so the endpoint's existence is not
// confirmed to unauthorized callers.
func internalOnly(token string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			var allowed bool
			if token != "" {
				allowed = subtle.ConstantTimeCompare([]byte(bearerToken(r)), []byte(token)) == 1
			} else {
				allowed = isInternalAddr(r.RemoteAddr)
			}

			if !allowed {
				writeNotFound(w)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Dependencies holds all injected dependencies for the router.
type Dependencies struct {
	Logger *slog.Logger
	DB     *pgxpool.Pool
	Redis  *redis.Client

	CORSAllowedOrigins []string
	MaxBodyBytes       int64

	// MetricsToken, when set, is the bearer token required to scrape /metrics.
	// When empty, /metrics is restricted to loopback and private ranges.
	MetricsToken string

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

	// Gateway
	GatewayPipeline *gateway.Pipeline

	// Repos needed for middleware
	OrgRepo        tenantRepo.OrgRepository
	WorkspaceRepo  tenantRepo.WorkspaceRepository
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

	// Prometheus metrics — operational surface, never public.
	r.With(internalOnly(deps.MetricsToken)).Handle("/metrics", promhttp.Handler())

	// API v1 routes
	r.Route("/api/v1", func(r chi.Router) {
		// Public auth routes (no JWT required)
		r.Route("/auth", func(r chi.Router) {
			// 20 requests/5min per IP: generous enough for a genuine user
			// retrying a typo, tight enough to blunt credential stuffing and
			// forgot-password email bombing.
			r.Use(middleware.RateLimit(20, 5*time.Minute))
			if deps.IAMHandler != nil {
				r.Post("/register", deps.IAMHandler.Register)
				r.Post("/login", deps.IAMHandler.Login)
				r.Post("/oauth", deps.IAMHandler.OAuthLogin)
				r.Post("/refresh", deps.IAMHandler.RefreshToken)
				r.Post("/forgot-password", deps.IAMHandler.ForgotPassword)
				r.Post("/reset-password", deps.IAMHandler.ResetPassword)
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
					r.Get("/current", deps.YuvmiHandler.GetCurrentGoal)
					r.Put("/current", deps.YuvmiHandler.UpdateGoal)
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
					r.Post("/design/confirm", deps.YuvmiHandler.ConfirmNotificationDesign)
				})

				r.Route("/tasks", func(r chi.Router) {
					r.Get("/today", deps.YuvmiHandler.GetTodayTask)
					r.Post("/{id}/complete", deps.YuvmiHandler.CompleteTask)
					r.Post("/{id}/skip", deps.YuvmiHandler.SkipTask)
				})

				r.Route("/pearls", func(r chi.Router) {
					r.Get("/balance", deps.YuvmiHandler.GetPearlBalance)
				})

				r.Route("/waves", func(r chi.Router) {
					r.Post("/survive", deps.YuvmiHandler.RecordWaveSurvived)
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

			// User routes (masterfabric IAM)
			if deps.IAMHandler != nil {
				r.With(maybeRequirePermission(deps.RBACService, "user:read")).Route("/users", func(r chi.Router) {
					r.Get("/", deps.IAMHandler.ListUsers)
					r.Get("/{id}", deps.IAMHandler.GetUser)
				})
				r.With(maybeRequirePermission(deps.RBACService, "user:write")).Post("/roles/assign", deps.IAMHandler.AssignRole)
			}

			// Catch-all: arriving here means no endpoint matched.
			r.HandleFunc("/*", func(w http.ResponseWriter, _ *http.Request) {
				writeNotFound(w)
			})
		})
	})

	// Anything not matched above gets the same opaque 404.
	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		writeNotFound(w)
	})

	return r
}
