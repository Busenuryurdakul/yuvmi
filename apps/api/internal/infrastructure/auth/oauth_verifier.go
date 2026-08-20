package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// OAuthClaims holds verified identity from an OAuth provider.
type OAuthClaims struct {
	Subject     string
	Email       string
	EmailVerified bool
	FirstName   string
	LastName    string
}

type OAuthVerifier struct {
	googleClientIDs []string
	appleBundleID   string
	client          *http.Client

	mu         sync.RWMutex
	googleKeys map[string]*rsa.PublicKey
	appleKeys  map[string]*rsa.PublicKey
	googleAt   time.Time
	appleAt    time.Time
}

func NewOAuthVerifier(googleClientIDs []string, appleBundleID string) *OAuthVerifier {
	return &OAuthVerifier{
		googleClientIDs: googleClientIDs,
		appleBundleID:   appleBundleID,
		client:          &http.Client{Timeout: 10 * time.Second},
		googleKeys:      map[string]*rsa.PublicKey{},
		appleKeys:       map[string]*rsa.PublicKey{},
	}
}

func (v *OAuthVerifier) VerifyGoogleIDToken(ctx context.Context, idToken string) (*OAuthClaims, error) {
	if idToken == "" {
		return nil, domainErr.New(domainErr.ErrBadRequest, "missing Google id_token", nil)
	}
	claims, err := v.verifyJWT(ctx, idToken, "google", "https://www.googleapis.com/oauth2/v3/certs")
	if err != nil {
		return nil, err
	}

	iss, _ := claims["iss"].(string)
	if iss != "accounts.google.com" && iss != "https://accounts.google.com" {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Google token issuer", nil)
	}

	aud := audienceString(claims["aud"])
	if len(v.googleClientIDs) > 0 && !contains(v.googleClientIDs, aud) {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Google token audience", nil)
	}

	sub, _ := claims["sub"].(string)
	if sub == "" {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Google token subject", nil)
	}

	email, _ := claims["email"].(string)
	verified := claimBool(claims["email_verified"])
	name, _ := claims["name"].(string)
	parts := strings.Fields(name)

	return &OAuthClaims{
		Subject:       sub,
		Email:         email,
		EmailVerified: verified,
		FirstName:     firstOr(parts, "Yuvmi"),
		LastName:      restOr(parts, "Kullanıcı"),
	}, nil
}

func (v *OAuthVerifier) VerifyAppleIdentityToken(ctx context.Context, identityToken string) (*OAuthClaims, error) {
	if identityToken == "" {
		return nil, domainErr.New(domainErr.ErrBadRequest, "missing Apple identity token", nil)
	}
	claims, err := v.verifyJWT(ctx, identityToken, "apple", "https://appleid.apple.com/auth/keys")
	if err != nil {
		return nil, err
	}

	iss, _ := claims["iss"].(string)
	if iss != "https://appleid.apple.com" {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Apple token issuer", nil)
	}

	aud := audienceString(claims["aud"])
	if v.appleBundleID != "" && aud != v.appleBundleID {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Apple token audience", nil)
	}

	sub, _ := claims["sub"].(string)
	if sub == "" {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid Apple token subject", nil)
	}

	email, _ := claims["email"].(string)
	verified := claimBool(claims["email_verified"])
	if email != "" && claims["email_verified"] == nil {
		verified = true
	}
	return &OAuthClaims{
		Subject:       sub,
		Email:         email,
		EmailVerified: verified,
		FirstName:     "Yuvmi",
		LastName:      "Kullanıcı",
	}, nil
}

func (v *OAuthVerifier) verifyJWT(ctx context.Context, tokenStr, provider, jwksURL string) (jwt.MapClaims, error) {
	keyfunc, err := v.jwksKeyfunc(ctx, provider, jwksURL)
	if err != nil {
		return nil, domainErr.New(domainErr.ErrInternal, "failed to load OAuth keys", err)
	}

	token, err := jwt.Parse(tokenStr, keyfunc, jwt.WithValidMethods([]string{"RS256"}))
	if err != nil || !token.Valid {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid OAuth token", err)
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, domainErr.New(domainErr.ErrUnauthorized, "invalid OAuth token claims", nil)
	}
	return claims, nil
}

func (v *OAuthVerifier) jwksKeyfunc(ctx context.Context, provider, jwksURL string) (jwt.Keyfunc, error) {
	keys, err := v.loadJWKS(ctx, provider, jwksURL)
	if err != nil {
		return nil, err
	}
	return func(t *jwt.Token) (interface{}, error) {
		kid, _ := t.Header["kid"].(string)
		key, ok := keys[kid]
		if !ok {
			return nil, fmt.Errorf("unknown key id: %s", kid)
		}
		return key, nil
	}, nil
}

func (v *OAuthVerifier) loadJWKS(ctx context.Context, provider, url string) (map[string]*rsa.PublicKey, error) {
	v.mu.RLock()
	var cached map[string]*rsa.PublicKey
	var cachedAt time.Time
	if provider == "google" {
		cached, cachedAt = v.googleKeys, v.googleAt
	} else {
		cached, cachedAt = v.appleKeys, v.appleAt
	}
	if time.Since(cachedAt) < time.Hour && len(cached) > 0 {
		v.mu.RUnlock()
		return cached, nil
	}
	v.mu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var jwks jwksResponse
	if err := json.Unmarshal(body, &jwks); err != nil {
		return nil, err
	}

	keys := map[string]*rsa.PublicKey{}
	for _, k := range jwks.Keys {
		pub, err := k.rsaPublicKey()
		if err != nil {
			continue
		}
		keys[k.Kid] = pub
	}

	v.mu.Lock()
	if provider == "google" {
		v.googleKeys = keys
		v.googleAt = time.Now()
	} else {
		v.appleKeys = keys
		v.appleAt = time.Now()
	}
	v.mu.Unlock()

	return keys, nil
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (k jwkKey) rsaPublicKey() (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(k.N)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(k.E)
	if err != nil {
		return nil, err
	}
	n := new(big.Int).SetBytes(nBytes)
	e := 0
	for _, b := range eBytes {
		e = e*256 + int(b)
	}
	return &rsa.PublicKey{N: n, E: e}, nil
}

func audienceString(v interface{}) string {
	switch t := v.(type) {
	case string:
		return t
	case []interface{}:
		if len(t) > 0 {
			if s, ok := t[0].(string); ok {
				return s
			}
		}
	}
	return ""
}

func contains(list []string, val string) bool {
	for _, item := range list {
		if item == val {
			return true
		}
	}
	return false
}

func firstOr(parts []string, fallback string) string {
	if len(parts) > 0 && parts[0] != "" {
		return parts[0]
	}
	return fallback
}

func restOr(parts []string, fallback string) string {
	if len(parts) > 1 {
		return strings.Join(parts[1:], " ")
	}
	return fallback
}

func claimBool(v interface{}) bool {
	switch t := v.(type) {
	case bool:
		return t
	case string:
		return strings.EqualFold(t, "true") || t == "1"
	default:
		return false
	}
}
