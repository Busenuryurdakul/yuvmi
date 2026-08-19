package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	// Infrastructure
	infraAuth "github.com/masterfabric-go/masterfabric/internal/infrastructure/auth"
	apimgmtHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/apimanagement"
	auditHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/audit"
	iamHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/iam"
	realtimeHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/realtime"
	tenantHandler "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/tenant"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/http/router"
	infraKafka "github.com/masterfabric-go/masterfabric/internal/infrastructure/kafka"
	infraWS "github.com/masterfabric-go/masterfabric/internal/infrastructure/websocket"
	pgApimgmt "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/apimanagement"
	pgAudit "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/audit"
	pgIam "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/iam"
	pgTenant "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/tenant"

	// Application use cases
	apimgmtUC "github.com/masterfabric-go/masterfabric/internal/application/apimanagement/usecase"
	iamUC "github.com/masterfabric-go/masterfabric/internal/application/iam/usecase"
	realtimeUC "github.com/masterfabric-go/masterfabric/internal/application/realtime/usecase"
	tenantUC "github.com/masterfabric-go/masterfabric/internal/application/tenant/usecase"

	// Gateway
	"github.com/masterfabric-go/masterfabric/internal/gateway"
	gatewayInterceptors "github.com/masterfabric-go/masterfabric/internal/infrastructure/gateway/interceptors"

	// Shared
	"github.com/masterfabric-go/masterfabric/internal/shared/cache"
	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/database"
	"github.com/masterfabric-go/masterfabric/internal/shared/events"
	"github.com/masterfabric-go/masterfabric/internal/shared/logger"
	"github.com/masterfabric-go/masterfabric/internal/shared/telemetry"
	"github.com/masterfabric-go/masterfabric/internal/shared/version"

	aiUC "github.com/masterfabric-go/masterfabric/internal/application/ai/usecase"
	yuvmiUC "github.com/masterfabric-go/masterfabric/internal/application/yuvmi/usecase"
	"github.com/masterfabric-go/masterfabric/internal/domain/alignment"
	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	infraAnthropic "github.com/masterfabric-go/masterfabric/internal/infrastructure/ai/anthropic"
	infraGemini "github.com/masterfabric-go/masterfabric/internal/infrastructure/ai/gemini"
	infraOpenAI "github.com/masterfabric-go/masterfabric/internal/infrastructure/ai/openai"
	aiHandlerPkg "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/ai"
	yuvmiHandlerPkg "github.com/masterfabric-go/masterfabric/internal/infrastructure/http/handler/yuvmi"
	pgAI "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/ai"
	pgFutureSelf "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/futureself"
	pgGoal "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/goal"
	pgProfile "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/profile"
	pgSpace "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/space"
	pgAsset "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/asset"
	pgSubscription "github.com/masterfabric-go/masterfabric/internal/infrastructure/postgres/subscription"
	infraStorage "github.com/masterfabric-go/masterfabric/internal/infrastructure/storage"
	infraNotify "github.com/masterfabric-go/masterfabric/internal/infrastructure/notification"
	"github.com/masterfabric-go/masterfabric/internal/infrastructure/scheduler"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Load configuration
	cfg := config.Load()

	// Initialize logger
	log := logger.New(cfg.Log.Level, cfg.Log.Format)
	slog.SetDefault(log)

	log.Info("starting masterfabric-go",
		"host", cfg.Server.Host,
		"port", cfg.Server.Port,
		"environment", cfg.Environment,
	)

	// Refuse to start in production with development defaults; elsewhere the
	// same findings are surfaced as warnings.
	warnings, err := cfg.Validate()
	if err != nil {
		return err
	}
	for _, w := range warnings {
		log.Warn("insecure configuration", "detail", w)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Initialize OpenTelemetry
	otelShutdown, err := telemetry.Setup(ctx, version.ServiceName, version.Version)
	if err != nil {
		log.Warn("opentelemetry setup failed", "error", err)
	} else {
		defer func() { _ = otelShutdown(context.Background()) }()
		log.Info("opentelemetry initialized")
	}

	// Initialize PostgreSQL. The database is not optional: without it the
	// router silently drops every dependent route and the API answers 404
	// instead of failing, so a connection failure has to stop the process.
	db, err := database.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		return fmt.Errorf("connect to postgres: %w", err)
	}
	defer db.Close()
	log.Info("connected to postgres")

	// Initialize Redis
	redisClient, err := cache.NewRedisClient(ctx, cfg.Redis)
	if err != nil {
		log.Warn("redis unavailable, running without cache", "error", err)
		redisClient = nil
	} else {
		defer redisClient.Close()
		log.Info("connected to redis")
	}

	// Initialize event bus (Kafka or in-process)
	eventBus := initEventBus(ctx, cfg, log)
	defer func() { _ = eventBus.Close() }()

	// Build dependencies
	deps, yuvmiSvc, err := buildDependencies(log, cfg, db, redisClient, eventBus)
	if err != nil {
		return err
	}

	// Start push notification cron
	if yuvmiSvc != nil && db != nil {
		notificationRepo := pgProfile.NewNotificationRepo(db)
		pushCron := scheduler.NewPushCron(yuvmiSvc, notificationRepo, cfg.Cron, log)
		pushCron.Start(context.Background())
		defer pushCron.Stop()
	}

	// Build router
	r := router.New(deps)

	// Create HTTP server
	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	// Graceful shutdown
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	serverErr := make(chan error, 1)
	go func() {
		log.Info("listening", "addr", addr)
		serverErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serverErr:
		if err != nil && err != http.ErrServerClosed {
			return fmt.Errorf("server error: %w", err)
		}
	case sig := <-shutdown:
		log.Info("shutdown signal received", "signal", sig)
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			_ = srv.Close()
			return fmt.Errorf("graceful shutdown failed: %w", err)
		}
		log.Info("server stopped gracefully")
	}

	return nil
}

// initEventBus creates either a Kafka bus or an in-process bus based on config.
func initEventBus(ctx context.Context, cfg *config.Config, log *slog.Logger) events.EventBus {
	if !cfg.Kafka.Enabled {
		log.Info("using in-process event bus (set KAFKA_ENABLED=true to use Kafka)")
		return events.NewInProcessBus(log, 256)
	}

	log.Info("initializing kafka event bus",
		"brokers", cfg.Kafka.Brokers,
		"group_id", cfg.Kafka.GroupID,
	)

	// Ensure topics exist
	if len(cfg.Kafka.Brokers) > 0 {
		if err := infraKafka.EnsureTopics(
			ctx,
			cfg.Kafka.Brokers[0],
			infraKafka.DefaultTopics(),
			cfg.Kafka.NumPartitions,
			cfg.Kafka.ReplicationFactor,
			log,
		); err != nil {
			log.Warn("failed to ensure kafka topics, falling back to in-process bus", "error", err)
			return events.NewInProcessBus(log, 256)
		}
	}

	kafkaBus := infraKafka.NewBus(cfg.Kafka.Brokers, cfg.Kafka.GroupID, log)

	// Start consuming (after subscriptions are registered in buildDependencies)
	// We start consumption with a background context so it outlives the startup ctx.
	kafkaBus.Start(context.Background())

	log.Info("kafka event bus initialized")
	return kafkaBus
}

func buildDependencies(
	log *slog.Logger,
	cfg *config.Config,
	db *pgxpool.Pool,
	redisClient *redis.Client,
	eventBus events.EventBus,
) (router.Dependencies, *yuvmiUC.Service, error) {
	deps := router.Dependencies{
		Logger:             log,
		DB:                 db,
		Redis:              redisClient,
		CORSAllowedOrigins: cfg.Server.CORSAllowedOrigins,
		MaxBodyBytes:       cfg.Server.MaxBodyBytes,
		MetricsToken:       cfg.Server.MetricsToken,
	}

	// db is guaranteed non-nil: run() aborts when the pool cannot be created.

	// --- Repositories ---
	userRepo := pgIam.NewUserRepo(db)
	refreshTokenRepo := pgIam.NewRefreshTokenRepo(db)
	passwordResetRepo := pgIam.NewPasswordResetRepo(db)
	roleRepo := pgIam.NewRoleRepo(db)
	orgRepo := pgTenant.NewOrgRepo(db)
	workspaceRepo := pgTenant.NewWorkspaceRepository(db)
	appRepo := pgTenant.NewAppRepo(db)
	apiKeyRepo := pgTenant.NewAPIKeyRepo(db)
	endpointRepo := pgApimgmt.NewEndpointRepo(db)
	policyRepo := pgApimgmt.NewPolicyRepo(db)
	auditRepo := pgAudit.NewAuditRepo(db)

	// --- Services ---
	jwtService := infraAuth.NewJWTService(cfg.JWT)
	oauthVerifier := infraAuth.NewOAuthVerifier(cfg.OAuth.GoogleClientIDs, cfg.OAuth.AppleBundleID)
	rbacService := infraAuth.NewRBACService(roleRepo, redisClient)

	deps.AuthService = jwtService
	deps.RBACService = rbacService
	deps.OrgRepo = orgRepo
	deps.WorkspaceRepo = workspaceRepo

	tokenIssuer := iamUC.NewTokenIssuer(jwtService, jwtService.RefreshExpiration(), refreshTokenRepo)

	// --- Use cases (with event bus for domain event publishing) ---
	registerUC := iamUC.NewRegisterUseCase(userRepo, jwtService, eventBus, cfg.Yuvmi)
	loginUC := iamUC.NewLoginUseCase(userRepo, jwtService, tokenIssuer, cfg.Yuvmi)
	oauthUC := iamUC.NewOAuthLoginUseCase(userRepo, oauthVerifier, tokenIssuer)
	refreshUC := iamUC.NewRefreshTokenUseCase(userRepo, jwtService, refreshTokenRepo, tokenIssuer)
	forgotPasswordUC := iamUC.NewForgotPasswordUseCase(userRepo, jwtService, passwordResetRepo, cfg.Yuvmi, cfg.SMTP, log)
	resetPasswordUC := iamUC.NewResetPasswordUseCase(userRepo, jwtService, passwordResetRepo, refreshTokenRepo)
	deleteAccountUC := iamUC.NewDeleteAccountUseCase(userRepo, jwtService, refreshTokenRepo)
	assignRoleUC := iamUC.NewAssignRoleUseCase(roleRepo, rbacService, eventBus)
	createOrgUC := tenantUC.NewCreateOrgUseCase(orgRepo, eventBus)
	createWorkspaceUC := tenantUC.NewCreateWorkspaceUseCase(workspaceRepo, orgRepo, eventBus)
	listWorkspacesUC := tenantUC.NewListWorkspacesUseCase(workspaceRepo)
	updateWorkspaceUC := tenantUC.NewUpdateWorkspaceUseCase(workspaceRepo)
	createAppUC := tenantUC.NewCreateAppUseCase(appRepo, orgRepo, eventBus)
	manageKeysUC := tenantUC.NewManageAPIKeysUseCase(apiKeyRepo)
	defineEndpointUC := apimgmtUC.NewDefineEndpointUseCase(endpointRepo, eventBus)
	updatePolicyUC := apimgmtUC.NewUpdatePolicyUseCase(policyRepo)
	retireEndpointUC := apimgmtUC.NewRetireEndpointUseCase(endpointRepo, eventBus)
	activateEndpointUC := apimgmtUC.NewActivateEndpointUseCase(endpointRepo, eventBus)

	// --- Register sample Kafka consumers ---
	// Log all IAM events
	eventBus.Subscribe(events.TopicIAM, func(ctx context.Context, event events.Event) error {
		log.Info("iam event received", "event", event)
		return nil
	})
	// Log all tenant events
	eventBus.Subscribe(events.TopicTenant, func(ctx context.Context, event events.Event) error {
		log.Info("tenant event received", "event", event)
		return nil
	})
	// Log all API management events
	eventBus.Subscribe(events.TopicAPIManagement, func(ctx context.Context, event events.Event) error {
		log.Info("api-management event received", "event", event)
		return nil
	})

	// --- Handlers ---
	deps.IAMHandler = iamHandler.NewHandler(
		registerUC, loginUC, oauthUC, refreshUC,
		forgotPasswordUC, resetPasswordUC, deleteAccountUC,
		assignRoleUC, userRepo,
	)
	deps.TenantHandler = tenantHandler.NewHandler(
		createOrgUC,
		createAppUC,
		manageKeysUC,
		createWorkspaceUC,
		listWorkspacesUC,
		updateWorkspaceUC,
		orgRepo,
		appRepo,
	)
	deps.APIMgmtHandler = apimgmtHandler.NewHandler(defineEndpointUC, updatePolicyUC, retireEndpointUC, activateEndpointUC, endpointRepo, policyRepo)
	deps.AuditHandler = auditHandler.NewHandler(auditRepo)

	// --- WebSocket real-time hub ---
	wsHub := infraWS.NewHub(log, cfg.WebSocket.MaxConnections)
	eventBridge := infraWS.NewEventBridge(wsHub, appRepo, log)
	eventBridge.Register(eventBus)

	validateConnectUC := realtimeUC.NewValidateConnectUseCase(appRepo, rbacService)
	wsUpgrader := infraWS.NewUpgrader(infraWS.UpgraderConfig{
		ReadBufferSize:  cfg.WebSocket.ReadBufferSize,
		WriteBufferSize: cfg.WebSocket.WriteBufferSize,
		AllowedOrigins:  cfg.Server.CORSAllowedOrigins,
	})
	deps.RealtimeHandler = realtimeHandler.NewHandler(realtimeHandler.Config{
		ValidateUC:   validateConnectUC,
		AuthService:  jwtService,
		Hub:          wsHub,
		Upgrader:     wsUpgrader,
		PingInterval: cfg.WebSocket.PingIntervalSec,
		Logger:       log,
		Enabled:      cfg.WebSocket.Enabled,
	})

	// --- Gateway pipeline with interceptors ---
	// Create interceptor chain: schema validation, PII masking, request/response transformers
	piiMasker := gatewayInterceptors.NewPIIMasker(
		[]string{"password", "password_hash", "api_key", "secret", "token", "ssn", "credit_card"},
		"***",
	)
	schemaValidator := gatewayInterceptors.NewSchemaValidator()

	// Create dynamic handler resolver for routing requests to backend service handlers
	// This supports:
	// 1. Registered handlers (if you register specific handlers)
	// 2. HTTP proxy to external services (if backend_service is a URL or configured)
	// 3. Generic dynamic database handler (automatically performs CRUD operations)
	backendRegistry := gateway.NewBackendRegistry()
	dynamicResolver := gateway.NewDynamicHandlerResolver(backendRegistry, log, db)
	
	// Optional: Register service configurations for HTTP proxying
	// Example:
	// dynamicResolver.RegisterServiceConfig("product-service", gateway.ServiceConfig{
	//     BaseURL: "https://api.example.com/products",
	//     Headers: map[string]string{"Authorization": "Bearer token"},
	// })
	
	// Optional: Register specific handlers for services that need custom logic
	// Example:
	// productHandler := handlers.NewProductHandler(...)
	// backendRegistry.Register("product-service", productHandler)

	// Wire interceptors into gateway pipeline with dynamic resolver
	deps.GatewayPipeline = gateway.NewPipeline(
		endpointRepo,
		policyRepo,
		rbacService,
		redisClient,
		log,
		dynamicResolver,
		schemaValidator,
		piiMasker,
	)

	// --- Yuvmi MVP domain ---
	profilePG := pgProfile.NewProfileRepo(db)
	futureSelfRepo := pgFutureSelf.NewFutureSelfRepo(db)
	goalRepo := pgGoal.NewGoalRepo(db)
	planRepo := pgGoal.NewPlanRepo(db)
	taskRepo := pgGoal.NewTaskRepo(db)
	checkinRepo := pgProfile.NewCheckinRepo(db)
	alignmentRepo := pgProfile.NewAlignmentRepo(db)
	reviewRepo := pgGoal.NewWeeklyReviewRepo(db)
	notificationRepo := pgProfile.NewNotificationRepo(db)
	spaceRepo := pgSpace.NewSpaceRepo(db)
	assetRepo := pgAsset.NewAssetRepo(db)
	subscriptionRepo := pgSubscription.NewSubscriptionRepo(db)
	publicBase := fmt.Sprintf("http://%s:%d/api/v1/assets", cfg.Server.Host, cfg.Server.Port)
	if cfg.Server.Host == "0.0.0.0" {
		publicBase = fmt.Sprintf("http://localhost:%d/api/v1/assets", cfg.Server.Port)
	}
	objectStorage, err := infraStorage.NewFromEnv(publicBase)
	if err != nil {
		log.Warn("object storage init failed, uploads disabled", "error", err)
	}
	pushClient := infraNotify.NewExpoPushClient()
	engine := alignment.NewEngine(taskRepo, checkinRepo, goalRepo, planRepo, alignmentRepo)
	yuvmiSvc := yuvmiUC.NewService(yuvmiUC.Deps{
		Users:         userRepo,
		Profiles:      profilePG,
		FutureSelf:    futureSelfRepo,
		Goals:         goalRepo,
		Plans:         planRepo,
		Tasks:         taskRepo,
		Checkins:      checkinRepo,
		Alignment:     alignmentRepo,
		Reviews:       reviewRepo,
		Notifications: notificationRepo,
		Spaces:        spaceRepo,
		Assets:        assetRepo,
		Subscriptions: subscriptionRepo,
		Storage:       objectStorage,
		Engine:        engine,
		Push:          pushClient,
		YuvmiCfg:      cfg.Yuvmi,
	})
	deps.YuvmiHandler = yuvmiHandlerPkg.NewHandler(yuvmiSvc)

	// --- AI orchestration ---
	aiProvider, err := newAIProvider(cfg.AI, log)
	if err != nil {
		return router.Dependencies{}, nil, err
	}
	aiSvc := aiUC.NewService(aiUC.Deps{
		Consents:   pgAI.NewConsentRepo(db),
		Jobs:       pgAI.NewJobRepo(db),
		Training:   pgAI.NewTrainingSampleRepo(db),
		Provider:   aiProvider,
		FutureSelf: futureSelfRepo,
		Goals:      goalRepo,
		Plans:      planRepo,
		Tasks:      taskRepo,
		Checkins:   checkinRepo,
		Cfg:        cfg.AI,
	})
	deps.AIHandler = aiHandlerPkg.NewHandler(aiSvc)

	return deps, yuvmiSvc, nil
}

// newAIProvider selects the vendor adapter named by AI_PROVIDER.
//
// An unrecognised name is a startup error rather than a fallback to the
// default. Silently serving Anthropic to someone who configured "gemini" would
// bill the wrong account, and silently disabling AI would look identical to a
// missing key — both hide a typo that is trivial to fix once it is named.
//
// A recognised provider with no API key is not an error: it reports itself
// unavailable, the suggestion endpoints return 501, and clients fall back to
// their static lists. Consent endpoints stay live either way.
func newAIProvider(cfg config.AIConfig, log *slog.Logger) (aiService.Provider, error) {
	var (
		provider aiService.Provider
		keyEnv   string
	)

	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "", "anthropic":
		provider = infraAnthropic.NewProvider(infraAnthropic.Config{
			APIKey:  cfg.APIKey,
			Model:   cfg.Model,
			Effort:  cfg.Effort,
			Timeout: cfg.Timeout,
		})
		keyEnv = "ANTHROPIC_API_KEY"

	case "gemini":
		gp := infraGemini.NewProvider(infraGemini.Config{
			APIKey:  cfg.APIKey,
			Model:   cfg.Model,
			Timeout: cfg.Timeout,
		})
		// A key that was supplied but rejected by the SDK is a real
		// misconfiguration, and it would otherwise be indistinguishable from
		// having set no key at all.
		if initErr := gp.InitError(); initErr != nil {
			return nil, fmt.Errorf("gemini provider init: %w", initErr)
		}
		provider = gp
		keyEnv = "GEMINI_API_KEY"

	case "openai":
		provider = infraOpenAI.NewProvider(infraOpenAI.Config{
			APIKey:  cfg.APIKey,
			Model:   cfg.Model,
			Timeout: cfg.Timeout,
		})
		keyEnv = "OPENAI_API_KEY"

	default:
		return nil, fmt.Errorf(
			"unknown AI_PROVIDER %q: expected \"anthropic\", \"gemini\" or \"openai\"", cfg.Provider)
	}

	if !provider.Available() {
		log.Warn("AI provider not configured, suggestion endpoints disabled",
			"provider", provider.Name(), "hint", "set "+keyEnv+" to enable")
	} else {
		log.Info("AI provider ready", "provider", provider.Name(), "model", cfg.Model)
	}
	return provider, nil
}
