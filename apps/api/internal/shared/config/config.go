package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all application configuration.
type Config struct {
	Environment string
	Server      ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	OAuth     OAuthConfig
	Yuvmi     YuvmiConfig
	SMTP      SMTPConfig
	Cron      CronConfig
	Kafka     KafkaConfig
	WebSocket WebSocketConfig
	Waitlist  WaitlistConfig
	Log       LogConfig
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
	MaxBodyBytes       int64
	// AuthCookieSecure overrides the production default. nil means "true in
	// production, and true when SameSite=None (required by browsers)".
	AuthCookieSecure   *bool
	AuthCookieSameSite string
	AuthCookieDomain   string
}

// IsProduction reports whether APP_ENV is production/prod.
func (c *Config) IsProduction() bool {
	if c == nil {
		return false
	}
	env := strings.ToLower(strings.TrimSpace(c.Environment))
	return env == "production" || env == "prod"
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
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
			AuthCookieSecure:   envBoolPtr("AUTH_COOKIE_SECURE"),
			AuthCookieSameSite: envOrDefault("AUTH_COOKIE_SAMESITE", "none"),
			AuthCookieDomain:   envOrDefault("AUTH_COOKIE_DOMAIN", ""),
		},
		Database: DatabaseConfig{
			Host:     envOrDefault("DB_HOST", "localhost"),
			Port:     envOrDefaultInt("DB_PORT", 5432),
			User:     envOrDefault("DB_USER", "masterfabric"),
			Password: envOrDefault("DB_PASSWORD", "masterfabric"),
			DBName:   envOrDefault("DB_NAME", "masterfabric"),
			SSLMode:  envOrDefault("DB_SSLMODE", "disable"),
			MaxConns: envOrDefaultInt32("DB_MAX_CONNS", 25),
			MinConns: envOrDefaultInt32("DB_MIN_CONNS", 5),
		},
		Redis: RedisConfig{
			Host:     envOrDefault("REDIS_HOST", "localhost"),
			Port:     envOrDefaultInt("REDIS_PORT", 6379),
			Password: envOrDefault("REDIS_PASSWORD", ""),
			DB:       envOrDefaultInt("REDIS_DB", 0),
		},
		JWT: JWTConfig{
			Secret:                  envOrDefault("JWT_SECRET", "change-me-in-production"),
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
		Waitlist: loadWaitlistConfig(),
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

func envBoolPtr(key string) *bool {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return nil
	}
	on := val == "1" || strings.EqualFold(val, "true")
	return &on
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
