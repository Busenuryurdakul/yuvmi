package middleware_test

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/middleware"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testHashKey = "test-waitlist-hmac-key"

func devWaitlistConfig() config.WaitlistConfig {
	return config.WaitlistConfig{
		RateLimitRequests: 5,
		RateLimitWindow:   time.Minute,
		RateLimitHashKey:  testHashKey,
		IsProduction:      false,
	}
}

func prodWaitlistConfig() config.WaitlistConfig {
	cfg := devWaitlistConfig()
	cfg.IsProduction = true
	return cfg
}

func TestWaitlistRateLimit_HMACSameIPSameKey(t *testing.T) {
	key1 := middleware.WaitlistRateLimitRedisKeyForTest(testHashKey, "203.0.113.10")
	key2 := middleware.WaitlistRateLimitRedisKeyForTest(testHashKey, "203.0.113.10")
	assert.Equal(t, key1, key2)
}

func TestWaitlistRateLimit_HMACDifferentIPDifferentKey(t *testing.T) {
	key1 := middleware.WaitlistRateLimitRedisKeyForTest(testHashKey, "203.0.113.10")
	key2 := middleware.WaitlistRateLimitRedisKeyForTest(testHashKey, "203.0.113.11")
	assert.NotEqual(t, key1, key2)
}

func TestWaitlistRateLimit_RawIPNotInRedisKey(t *testing.T) {
	rawIP := "203.0.113.10"
	key := middleware.WaitlistRateLimitRedisKeyForTest(testHashKey, rawIP)
	assert.True(t, strings.HasPrefix(key, middleware.WaitlistRateLimitKeyPrefixForTest()))
	assert.NotContains(t, key, rawIP)
}

func TestWaitlistRateLimit_NilRedisDevelopmentFailOpen(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.WaitlistRateLimit(nil, devWaitlistConfig(), nil)(next)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.True(t, called)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestWaitlistRateLimit_NilRedisProductionFailClosed(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("next handler must not run")
	})

	handler := middleware.WaitlistRateLimit(nil, prodWaitlistConfig(), slog.Default())(next)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
}

func TestWaitlistRateLimit_RedisErrorDevelopmentFailOpen(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		DialTimeout: 50 * time.Millisecond,
	})
	defer client.Close()

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.WaitlistRateLimit(client, devWaitlistConfig(), slog.Default())(next)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req = req.WithContext(context.Background())
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.True(t, called)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestWaitlistRateLimit_RedisErrorProductionFailClosed(t *testing.T) {
	client := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		DialTimeout: 50 * time.Millisecond,
	})
	defer client.Close()

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		t.Fatal("next handler must not run")
	})

	handler := middleware.WaitlistRateLimit(client, prodWaitlistConfig(), slog.Default())(next)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req = req.WithContext(context.Background())
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusServiceUnavailable, rec.Code)
}

func TestWaitlistRateLimit_ThresholdAndRetryAfter(t *testing.T) {
	ctx := context.Background()
	client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("SKIPPED_NO_REDIS: redis unavailable for rate limit integration test")
	}
	defer client.Close()

	require.NoError(t, client.FlushDB(ctx).Err())

	limit := 2
	cfg := devWaitlistConfig()
	cfg.RateLimitRequests = limit
	cfg.RateLimitWindow = time.Minute

	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	handler := middleware.WaitlistRateLimit(client, cfg, nil)(next)

	for i := 0; i < limit; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
		req = req.WithContext(ctx)
		req.RemoteAddr = "127.0.0.1:12345"
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		require.Equal(t, http.StatusOK, rec.Code, "request %d", i+1)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/public/waitlist", nil)
	req = req.WithContext(ctx)
	req.RemoteAddr = "127.0.0.1:12345"
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusTooManyRequests, rec.Code)
	assert.NotEmpty(t, rec.Header().Get("Retry-After"))
	assert.NotContains(t, rec.Body.String(), "@")
}

func TestWaitlistRateLimit_TTLSetOnFirstIncrement(t *testing.T) {
	ctx := context.Background()
	client := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	if err := client.Ping(ctx).Err(); err != nil {
		t.Skip("SKIPPED_NO_REDIS: redis unavailable for TTL integration test")
	}
	defer client.Close()

	require.NoError(t, client.FlushDB(ctx).Err())

	window := 60 * time.Second
	count, err := middleware.IncrementFixedWindowForTest(ctx, client, testHashKey, "203.0.113.55", window)
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)

	key := middleware.FormatWaitlistRateLimitKeyForTest(testHashKey, "203.0.113.55")
	ttl, err := client.TTL(ctx, key).Result()
	require.NoError(t, err)
	assert.Greater(t, ttl, time.Duration(0))
	assert.LessOrEqual(t, ttl, window)
}
