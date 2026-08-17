package middleware

import (
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// RateLimit throttles requests per client IP using a fixed-window counter.
// It is meant for public, unauthenticated endpoints (registration, login,
// password reset) where an attacker could otherwise brute-force credentials
// or flood outbound email without ever presenting a JWT.
//
// State is kept in-process, so limits are per server instance rather than
// global across a fleet. That is an acceptable trade-off for the single-node
// deployment this API currently runs on; a shared store (Redis) would be
// needed if replicas are added later.
func RateLimit(limit int, window time.Duration) func(http.Handler) http.Handler {
	l := &rateLimiter{limit: limit, window: window, buckets: make(map[string]*bucket)}
	return l.middleware
}

type bucket struct {
	count      int
	windowEnds time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	buckets map[string]*bucket
}

func (l *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(clientIP(r)) {
			w.Header().Set("Retry-After", strconv.Itoa(int(l.window.Seconds())))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"error":"too many requests","code":429}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (l *rateLimiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[key]
	if !ok || now.After(b.windowEnds) {
		if len(l.buckets) > 10000 {
			l.evictExpiredLocked(now)
		}
		b = &bucket{windowEnds: now.Add(l.window)}
		l.buckets[key] = b
	}
	b.count++
	return b.count <= l.limit
}

// evictExpiredLocked drops expired buckets so a long-running process doesn't
// accumulate one entry per distinct caller IP forever. Called with mu held.
func (l *rateLimiter) evictExpiredLocked(now time.Time) {
	for k, b := range l.buckets {
		if now.After(b.windowEnds) {
			delete(l.buckets, k)
		}
	}
}

// clientIP extracts the caller's address from RemoteAddr. It does not trust
// X-Forwarded-For, matching the rest of this package (see isInternalAddr in
// the router) — if the API ends up behind a proxy that obscures RemoteAddr,
// this collapses to one shared bucket and needs a trusted-proxy IP resolver.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	return strings.Trim(host, "[]")
}
