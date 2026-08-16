package middleware

import (
	"net"
	"net/http"
	"strings"
)

// ResolveClientIP returns the client IP using RemoteAddr by default.
// X-Forwarded-For is evaluated only when the immediate peer is a configured trusted proxy.
func ResolveClientIP(r *http.Request, trustedProxyCIDRs []string) string {
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
