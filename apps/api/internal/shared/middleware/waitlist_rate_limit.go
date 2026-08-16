package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/masterfabric-go/masterfabric/internal/shared/response"
	"github.com/redis/go-redis/v9"
)

const (
	waitlistRateLimitKeyPrefix = "waitlist:rl:"
	waitlistRateLimitLua       = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`
)

// WaitlistRateLimit limits public waitlist requests per client IP using Redis.
func WaitlistRateLimit(redisClient *redis.Client, cfg config.WaitlistConfig, logger *slog.Logger) func(http.Handler) http.Handler {
	script := redis.NewScript(waitlistRateLimitLua)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if cfg.RateLimitRequests <= 0 {
				next.ServeHTTP(w, r)
				return
			}

			if redisClient == nil {
				if cfg.IsProduction {
					response.JSON(w, http.StatusServiceUnavailable, map[string]string{
						"error":   http.StatusText(http.StatusServiceUnavailable),
						"message": "service temporarily unavailable",
						"code":    "503",
					})
					return
				}
				if logger != nil {
					logger.Warn("waitlist rate limit skipped: redis unavailable")
				}
				next.ServeHTTP(w, r)
				return
			}

			clientIP := ResolveClientIP(r, cfg.TrustedProxyCIDRs)
			if clientIP == "" {
				next.ServeHTTP(w, r)
				return
			}

			key := waitlistRateLimitRedisKey(cfg.RateLimitHashKey, clientIP)
			count, err := incrementFixedWindow(r.Context(), script, redisClient, key, cfg.RateLimitWindow)
			if err != nil {
				if cfg.IsProduction {
					if logger != nil {
						logger.Warn("waitlist rate limit redis error")
					}
					response.JSON(w, http.StatusServiceUnavailable, map[string]string{
						"error":   http.StatusText(http.StatusServiceUnavailable),
						"message": "service temporarily unavailable",
						"code":    "503",
					})
					return
				}
				if logger != nil {
					logger.Warn("waitlist rate limit skipped: redis error")
				}
				next.ServeHTTP(w, r)
				return
			}

			if count > int64(cfg.RateLimitRequests) {
				retryAfter := int(cfg.RateLimitWindow.Seconds())
				if retryAfter < 1 {
					retryAfter = 1
				}
				w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
				response.JSON(w, http.StatusTooManyRequests, map[string]string{
					"error":   http.StatusText(http.StatusTooManyRequests),
					"message": "rate limit exceeded",
					"code":    "429",
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func incrementFixedWindow(ctx context.Context, script *redis.Script, client *redis.Client, key string, window time.Duration) (int64, error) {
	seconds := int64(window.Seconds())
	if seconds < 1 {
		seconds = 1
	}

	result, err := script.Run(ctx, client, []string{key}, seconds).Int64()
	if err != nil {
		return 0, err
	}
	return result, nil
}

func waitlistRateLimitRedisKey(hashKey, clientIP string) string {
	mac := hmac.New(sha256.New, []byte(hashKey))
	_, _ = mac.Write([]byte(clientIP))
	return waitlistRateLimitKeyPrefix + hex.EncodeToString(mac.Sum(nil))
}

// WaitlistRateLimitRedisKeyForTest exposes the HMAC-based Redis key for tests.
func WaitlistRateLimitRedisKeyForTest(hashKey, clientIP string) string {
	return waitlistRateLimitRedisKey(hashKey, clientIP)
}

// IncrementFixedWindowForTest exposes the Lua limiter for tests.
func IncrementFixedWindowForTest(ctx context.Context, client *redis.Client, hashKey, clientIP string, window time.Duration) (int64, error) {
	script := redis.NewScript(waitlistRateLimitLua)
	return incrementFixedWindow(ctx, script, client, waitlistRateLimitRedisKey(hashKey, clientIP), window)
}

// WaitlistRateLimitKeyPrefixForTest exposes the Redis key prefix for tests.
func WaitlistRateLimitKeyPrefixForTest() string {
	return waitlistRateLimitKeyPrefix
}

// FormatWaitlistRateLimitKeyForTest builds the full Redis key for assertions.
func FormatWaitlistRateLimitKeyForTest(hashKey, clientIP string) string {
	return fmt.Sprintf("%s%s", waitlistRateLimitKeyPrefix, hmacHex(hashKey, clientIP))
}

func hmacHex(hashKey, clientIP string) string {
	mac := hmac.New(sha256.New, []byte(hashKey))
	_, _ = mac.Write([]byte(clientIP))
	return hex.EncodeToString(mac.Sum(nil))
}
