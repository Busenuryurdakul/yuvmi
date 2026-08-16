package middleware

import (
	"errors"
	"net"
	"net/http"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
)

const cfConnectingIPHeader = "CF-Connecting-IP"

// ErrClientIPUnavailable is returned when the client IP cannot be determined safely.
var ErrClientIPUnavailable = errors.New("client ip unavailable")

// ResolveClientIP returns the client IP according to WAITLIST_CLIENT_IP_MODE.
// Forwarded headers are ignored in direct mode. Render mode uses only CF-Connecting-IP.
func ResolveClientIP(r *http.Request, cfg config.WaitlistConfig) (string, error) {
	mode := strings.ToLower(strings.TrimSpace(cfg.ClientIPMode))
	if mode == "" {
		mode = config.ClientIPModeDirect
	}

	switch mode {
	case config.ClientIPModeDirect:
		return resolveDirectClientIP(r), nil
	case config.ClientIPModeTrustedCIDRs:
		return resolveTrustedCIDRClientIP(r, cfg.TrustedProxyCIDRs), nil
	case config.ClientIPModeRender:
		return resolveRenderClientIP(r, cfg)
	default:
		return "", ErrClientIPUnavailable
	}
}

func resolveDirectClientIP(r *http.Request) string {
	return parseHost(r.RemoteAddr)
}

func resolveTrustedCIDRClientIP(r *http.Request, trustedProxyCIDRs []string) string {
	peerIP := parseHost(r.RemoteAddr)
	if peerIP == "" {
		return ""
	}

	if len(trustedProxyCIDRs) == 0 || !ipInAnyCIDR(peerIP, trustedProxyCIDRs) {
		return peerIP
	}

	xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if xff == "" {
		return peerIP
	}

	parts := splitForwardedFor(xff)
	if len(parts) == 0 {
		return peerIP
	}

	for i := len(parts) - 1; i >= 0; i-- {
		candidate := parts[i]
		if candidate == "" || net.ParseIP(candidate) == nil {
			continue
		}
		if !ipInAnyCIDR(candidate, trustedProxyCIDRs) {
			return candidate
		}
	}

	if ip := net.ParseIP(parts[0]); ip != nil {
		return parts[0]
	}

	return peerIP
}

func resolveRenderClientIP(r *http.Request, cfg config.WaitlistConfig) (string, error) {
	if strings.TrimSpace(cfg.RenderServiceID) == "" {
		return "", ErrClientIPUnavailable
	}
	if strings.ToLower(strings.TrimSpace(cfg.RenderServiceType)) != "web" {
		return "", ErrClientIPUnavailable
	}

	values := r.Header.Values(cfConnectingIPHeader)
	if len(values) != 1 {
		return "", ErrClientIPUnavailable
	}

	raw := strings.TrimSpace(values[0])
	if raw == "" || strings.Contains(raw, ",") || strings.ContainsAny(raw, " \t") {
		return "", ErrClientIPUnavailable
	}

	if net.ParseIP(raw) == nil {
		return "", ErrClientIPUnavailable
	}

	return raw, nil
}

func parseHost(remoteAddr string) string {
	if remoteAddr == "" {
		return ""
	}

	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		host = remoteAddr
	}

	host = strings.TrimSpace(host)
	if host == "" || net.ParseIP(host) == nil {
		return ""
	}

	return host
}

func splitForwardedFor(header string) []string {
	rawParts := strings.Split(header, ",")
	parts := make([]string, 0, len(rawParts))
	for _, part := range rawParts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func ipInAnyCIDR(ip string, cidrs []string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	for _, cidr := range cidrs {
		_, network, err := net.ParseCIDR(strings.TrimSpace(cidr))
		if err != nil {
			continue
		}
		if network.Contains(parsedIP) {
			return true
		}
	}

	return false
}
