package config

import (
	"bufio"
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Development-only defaults. Running with any of these in production is
// refused by Validate.
const (
	DefaultJWTSecret  = "change-me-in-production"
	DefaultDBPassword = "yuvmi"
)

// Config holds all application configuration.
type Config struct {
	// Environment is the deployment environment: "development" (default),
	// "staging" or "production". Only production is treated as strict.
	Environment string

	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	OAuth     OAuthConfig
	Yuvmi     YuvmiConfig
	AI        AIConfig
	SMTP      SMTPConfig
	Cron      CronConfig
	Kafka     KafkaConfig
	WebSocket WebSocketConfig
	Log       LogConfig
}

// IsProduction reports whether the process is running in production.
func (c *Config) IsProduction() bool {
	switch strings.ToLower(strings.TrimSpace(c.Environment)) {
	case "production", "prod":
		return true
	default:
		return false
	}
}

// unsafeDefaults lists every configuration value still sitting on a
// development-only default that would be dangerous in production.
func (c *Config) unsafeDefaults() []string {
	var problems []string

	if c.JWT.Secret == "" || c.JWT.Secret == DefaultJWTSecret {
		problems = append(problems,
			"JWT_SECRET is empty or still the built-in default; anyone can forge authentication tokens")
	}
	if c.Database.URL == "" {
		if c.Database.Password == DefaultDBPassword {
			problems = append(problems,
				`DB_PASSWORD is still the built-in default "yuvmi"`)
		}
		if strings.EqualFold(strings.TrimSpace(c.Database.SSLMode), "disable") {
			problems = append(problems,
				`DB_SSLMODE is "disable"; the database connection is unencrypted`)
		}
	} else {
		if strings.Contains(strings.ToLower(c.Database.URL), "sslmode=disable") {
			problems = append(problems,
				`DATABASE_URL has sslmode=disable; the database connection is unencrypted`)
		}
	}

	return problems
}

// Validate reports configuration that is unsafe to run with.
//
// In production it returns an error so the caller can refuse to start. In every
// other environment the same findings are returned as warnings, so local
// development keeps working with the defaults from .env.example.
func (c *Config) Validate() (warnings []string, err error) {
	problems := c.unsafeDefaults()
	if len(problems) == 0 {
		return nil, nil
	}

	if c.IsProduction() {
		return nil, fmt.Errorf(
			"refusing to start in %s with unsafe configuration:\n  - %s",
			c.Environment, strings.Join(problems, "\n  - "))
	}

	return problems, nil
}

// WebSocketConfig holds real-time WebSocket settings.
type WebSocketConfig struct {
	Enabled         bool
	MaxConnections  int
	PingIntervalSec int
	ReadBufferSize  int
	WriteBufferSize int
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Host              string
	Port              int
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	CORSAllowedOrigins []string
	MaxBodyBytes      int64
	// MetricsToken, when set, is the bearer token required to scrape /metrics.
	// When empty, /metrics is reachable only from loopback and private ranges.
	MetricsToken string
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	URL      string
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
	MaxConns int32
	MinConns int32
}

// DSN returns the PostgreSQL connection string with escaped credentials.
func (d DatabaseConfig) DSN() string {
	if d.URL != "" {
		return d.URL
	}
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(d.User, d.Password),
		Host:   fmt.Sprintf("%s:%d", d.Host, d.Port),
		Path:   "/" + d.DBName,
	}
	u.RawQuery = url.Values{"sslmode": {d.SSLMode}}.Encode()
	return u.String()
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

// Addr returns the Redis address string.
func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

// JWTConfig holds JWT signing settings.
type JWTConfig struct {
	Secret                 string
	ExpirationHours        int
	AccessExpirationMinutes int
	RefreshExpirationDays  int
	Issuer                 string
}

// OAuthConfig holds OAuth provider verification settings.
type OAuthConfig struct {
	GoogleClientIDs []string
	AppleBundleID   string
}

// YuvmiConfig holds Yuvmi product-specific feature flags.
type YuvmiConfig struct {
	AllowDevOAuth    bool
	AllowDevPremium  bool
	DevOAuthPassword string
	LogPasswordReset bool
	AppBaseURL       string
	Stripe           StripeConfig
}

// StripeConfig holds Stripe Checkout + webhook settings.
type StripeConfig struct {
	SecretKey      string
	WebhookSecret  string
	PriceID        string
	SuccessURL     string
	CancelURL      string
}

func (c StripeConfig) Enabled() bool {
	return c.SecretKey != "" && c.PriceID != ""
}

// AIConfig holds AI orchestration settings. AI is opt-in: with no API key the
// suggestion endpoints report themselves unavailable and clients fall back to
// their static lists, so a deployment without AI credentials works unchanged.
type AIConfig struct {
	// Provider selects the vendor adapter. Only "anthropic" is implemented;
	// the field exists so adding one is a config change, not a code change.
	Provider string
	APIKey   string
	Model    string
	// Effort tunes thinking depth against the PRD's 25s P95 latency budget.
	Effort  string
	Timeout time.Duration
	// MaxTokens bounds one generation's output. Suggestion payloads are small;
	// the headroom is for the model's thinking tokens, which share this cap.
	MaxTokens int
	// DailyQuota caps generations per user per scope per day. Zero disables
	// the check.
	DailyQuota int
}

// Enabled reports whether AI generation can actually run.
func (c AIConfig) Enabled() bool {
	return c.APIKey != ""
}

// SMTPConfig holds optional email delivery settings.
type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// CronConfig holds background job settings.
type CronConfig struct {
	Enabled          bool
	PushIntervalMin  int
	DailyReminderHour int
	WeeklyReminderDay int // 0=Sunday
}

// KafkaConfig holds Kafka connection and consumer settings.
type KafkaConfig struct {
	Brokers           []string
	GroupID           string
	Enabled           bool
	NumPartitions     int
	ReplicationFactor int
}

// LogConfig holds logging settings.
type LogConfig struct {
	Level  string // debug, info, warn, error
	Format string // json, text
}

// Load reads configuration from environment variables with sensible defaults.
func Load() *Config {
	loadEnvFile()
	return &Config{
		Environment: envOrDefault("APP_ENV", "development"),
		Server: ServerConfig{
			Host:               envOrDefault("SERVER_HOST", "0.0.0.0"),
			Port:               envOrDefaultInt("SERVER_PORT", 8080),
			ReadTimeout:        time.Duration(envOrDefaultInt("SERVER_READ_TIMEOUT_SECONDS", 15)) * time.Second,
			WriteTimeout:       time.Duration(envOrDefaultInt("SERVER_WRITE_TIMEOUT_SECONDS", 15)) * time.Second,
			IdleTimeout:        time.Duration(envOrDefaultInt("SERVER_IDLE_TIMEOUT_SECONDS", 60)) * time.Second,
			CORSAllowedOrigins: envOrDefaultSlice("CORS_ALLOWED_ORIGINS", nil),
			MaxBodyBytes:       envOrDefaultInt64("MAX_BODY_BYTES", 1<<20),
			MetricsToken:       envOrDefault("METRICS_TOKEN", ""),
		},
		Database: loadDatabaseConfig(),
		Redis: RedisConfig{
			Host:     envOrDefault("REDIS_HOST", "localhost"),
			Port:     envOrDefaultInt("REDIS_PORT", 6379),
			Password: envOrDefault("REDIS_PASSWORD", ""),
			DB:       envOrDefaultInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:                  envOrDefault("JWT_SECRET", DefaultJWTSecret),
			ExpirationHours:         envOrDefaultInt("JWT_EXPIRATION_HOURS", 24),
			AccessExpirationMinutes: envOrDefaultInt("JWT_ACCESS_EXPIRATION_MINUTES", 60),
			RefreshExpirationDays:   envOrDefaultInt("JWT_REFRESH_EXPIRATION_DAYS", 30),
			Issuer:                  envOrDefault("JWT_ISSUER", "masterfabric"),
		},
		OAuth: OAuthConfig{
			GoogleClientIDs: envOrDefaultSlice("OAUTH_GOOGLE_CLIENT_IDS", nil),
			AppleBundleID:   envOrDefault("OAUTH_APPLE_BUNDLE_ID", "com.yuvmi.app"),
		},
		Yuvmi: YuvmiConfig{
			AllowDevOAuth:    envOrDefault("YUVMI_ALLOW_DEV_OAUTH", "0") == "1",
			AllowDevPremium:  envOrDefault("YUVMI_ALLOW_DEV_PREMIUM", "0") == "1",
			DevOAuthPassword: envOrDefault("YUVMI_DEV_OAUTH_PASSWORD", "yuvmi-dev-12345678"),
			LogPasswordReset: envOrDefault("YUVMI_LOG_PASSWORD_RESET", "0") == "1",
			AppBaseURL:       envOrDefault("YUVMI_APP_BASE_URL", "http://localhost:8081"),
			Stripe: StripeConfig{
				SecretKey:     envOrDefault("STRIPE_SECRET_KEY", ""),
				WebhookSecret: envOrDefault("STRIPE_WEBHOOK_SECRET", ""),
				PriceID:       envOrDefault("STRIPE_PRICE_ID", ""),
				SuccessURL:    envOrDefault("STRIPE_SUCCESS_URL", envOrDefault("YUVMI_APP_BASE_URL", "http://localhost:8081")+"/premium?checkout=success"),
				CancelURL:     envOrDefault("STRIPE_CANCEL_URL", envOrDefault("YUVMI_APP_BASE_URL", "http://localhost:8081")+"/premium?checkout=cancel"),
			},
		},
		AI: AIConfig{
			Provider:   envOrDefault("AI_PROVIDER", "anthropic"),
			APIKey:     envOrDefault("ANTHROPIC_API_KEY", ""),
			Model:      envOrDefault("AI_MODEL", "claude-opus-5"),
			Effort:     envOrDefault("AI_EFFORT", "low"),
			Timeout:    time.Duration(envOrDefaultInt("AI_TIMEOUT_SECONDS", 30)) * time.Second,
			MaxTokens:  envOrDefaultInt("AI_MAX_TOKENS", 4096),
			DailyQuota: envOrDefaultInt("AI_DAILY_QUOTA", 20),
		},
		SMTP: SMTPConfig{
			Host:     envOrDefault("SMTP_HOST", ""),
			Port:     envOrDefaultInt("SMTP_PORT", 587),
			User:     envOrDefault("SMTP_USER", ""),
			Password: envOrDefault("SMTP_PASSWORD", ""),
			From:     envOrDefault("SMTP_FROM", "noreply@yuvmi.app"),
		},
		Cron: CronConfig{
			Enabled:           envOrDefault("CRON_ENABLED", "true") == "true",
			PushIntervalMin:   envOrDefaultInt("CRON_PUSH_INTERVAL_MINUTES", 15),
			DailyReminderHour: envOrDefaultInt("CRON_DAILY_REMINDER_HOUR", 9),
			WeeklyReminderDay: envOrDefaultInt("CRON_WEEKLY_REMINDER_DAY", 0),
		},
		Kafka: KafkaConfig{
			Brokers:           envOrDefaultSlice("KAFKA_BROKERS", []string{"localhost:9092"}),
			GroupID:           envOrDefault("KAFKA_GROUP_ID", "masterfabric-go"),
			Enabled:           envOrDefault("KAFKA_ENABLED", "false") == "true",
			NumPartitions:     envOrDefaultInt("KAFKA_NUM_PARTITIONS", 3),
			ReplicationFactor: envOrDefaultInt("KAFKA_REPLICATION_FACTOR", 1),
		},
		WebSocket: WebSocketConfig{
			Enabled:         envOrDefault("WS_ENABLED", "true") == "true",
			MaxConnections:  envOrDefaultInt("WS_MAX_CONNECTIONS", 1000),
			PingIntervalSec: envOrDefaultInt("WS_PING_INTERVAL_SECONDS", 30),
			ReadBufferSize:  envOrDefaultInt("WS_READ_BUFFER_SIZE", 1024),
			WriteBufferSize: envOrDefaultInt("WS_WRITE_BUFFER_SIZE", 1024),
		},
		Log: LogConfig{
			Level:  envOrDefault("LOG_LEVEL", "info"),
			Format: envOrDefault("LOG_FORMAT", "json"),
		},
	}
}

func envOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func envOrDefaultInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}

func envOrDefaultInt32(key string, defaultVal int32) int32 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 32); err == nil {
			return int32(n)
		}
	}
	return defaultVal
}

func envOrDefaultInt64(key string, defaultVal int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil {
			return n
		}
	}
	return defaultVal
}

func envOrDefaultSlice(key string, defaultVal []string) []string {
	if val := os.Getenv(key); val != "" {
		parts := strings.Split(val, ",")
		var result []string
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		if len(result) > 0 {
			return result
		}
	}
	return defaultVal
}

func loadEnvFile() {
	paths := []string{".env", "apps/api/.env", "../../apps/api/.env"}
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		defer f.Close()
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				k := strings.TrimSpace(parts[0])
				v := strings.TrimSpace(parts[1])
				v = strings.Trim(v, `"'`)
				if _, exists := os.LookupEnv(k); !exists {
					_ = os.Setenv(k, v)
				}
			}
		}
		return
	}
}

func loadDatabaseConfig() DatabaseConfig {
	rawURL := envOrDefault("DATABASE_URL", "")
	if rawURL != "" {
		if u, err := url.Parse(rawURL); err == nil && u.Host != "" {
			host := u.Hostname()
			port := 5432
			if p, err := strconv.Atoi(u.Port()); err == nil && p > 0 {
				port = p
			}
			user := ""
			password := ""
			if u.User != nil {
				user = u.User.Username()
				password, _ = u.User.Password()
			}
			dbname := strings.TrimPrefix(u.Path, "/")
			sslMode := u.Query().Get("sslmode")
			if sslMode == "" {
				sslMode = "require"
			}
			return DatabaseConfig{
				URL:      rawURL,
				Host:     host,
				Port:     port,
				User:     user,
				Password: password,
				DBName:   dbname,
				SSLMode:  sslMode,
				MaxConns: envOrDefaultInt32("DB_MAX_CONNS", 25),
				MinConns: envOrDefaultInt32("DB_MIN_CONNS", 5),
			}
		}
	}

	return DatabaseConfig{
		Host:     envOrDefault("DB_HOST", "localhost"),
		Port:     envOrDefaultInt("DB_PORT", 5432),
		User:     envOrDefault("DB_USER", "yuvmi"),
		Password: envOrDefault("DB_PASSWORD", DefaultDBPassword),
		DBName:   envOrDefault("DB_NAME", "yuvmi"),
		SSLMode:  envOrDefault("DB_SSLMODE", "disable"),
		MaxConns: envOrDefaultInt32("DB_MAX_CONNS", 25),
		MinConns: envOrDefaultInt32("DB_MIN_CONNS", 5),
	}
}

