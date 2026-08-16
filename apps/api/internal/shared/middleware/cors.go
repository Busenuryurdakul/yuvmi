package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORSOptions builds chi/cors options with an exact origin allowlist.
// Wildcard entries never allow all origins. Unknown origins receive no CORS headers.
func CORSOptions(origins []string) cors.Options {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		if origin == "" || origin == "*" {
			continue
		}
		allowed[origin] = struct{}{}
	}

	opts := cors.Options{
		AllowedOrigins:   nil,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "X-Organization-ID", "X-App-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: len(allowed) > 0,
		MaxAge:           300,
		AllowOriginFunc: func(_ *http.Request, origin string) bool {
			_, ok := allowed[origin]
			return ok
		},
	}

	if len(allowed) == 0 {
		opts.AllowCredentials = false
		opts.AllowOriginFunc = func(_ *http.Request, _ string) bool { return false }
	}

	return opts
}
