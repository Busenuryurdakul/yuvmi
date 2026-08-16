package decoder

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	domainErr "github.com/masterfabric-go/masterfabric/internal/shared/errors"
)

// DecodeSignupRequest parses and validates a waitlist signup request body.
func DecodeSignupRequest(r *http.Request) (dto.SignupRequest, error) {
	if r.Body == nil {
		return dto.SignupRequest{}, domainErr.New(domainErr.ErrBadRequest, "request body is required", nil)
	}

	limited := io.LimitReader(r.Body, dto.SignupMaxBodyBytes+1)
	dec := json.NewDecoder(limited)
	dec.DisallowUnknownFields()

	var req dto.SignupRequest
	if err := dec.Decode(&req); err != nil {
		if errors.Is(err, io.EOF) {
			return dto.SignupRequest{}, domainErr.New(domainErr.ErrBadRequest, "request body is required", nil)
		}
		return dto.SignupRequest{}, domainErr.New(domainErr.ErrBadRequest, "invalid JSON: "+sanitizeJSONError(err), nil)
	}

	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return dto.SignupRequest{}, domainErr.New(domainErr.ErrBadRequest, "request body must contain a single JSON object", nil)
	}

	if err := validateSignupRequest(&req); err != nil {
		return dto.SignupRequest{}, err
	}

	return req, nil
}

func validateSignupRequest(req *dto.SignupRequest) error {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" {
		return domainErr.New(domainErr.ErrValidation, "email is required", nil)
	}
	if len(req.Email) > dto.SignupMaxEmailLength {
		return domainErr.New(domainErr.ErrValidation, fmt.Sprintf("email must be at most %d characters", dto.SignupMaxEmailLength), nil)
	}
	if !strings.Contains(req.Email, "@") || strings.HasPrefix(req.Email, "@") || strings.HasSuffix(req.Email, "@") {
		return domainErr.New(domainErr.ErrValidation, "email must be a valid email address", nil)
	}
	if !req.Consent {
		return domainErr.New(domainErr.ErrValidation, "consent must be true", nil)
	}
	return nil
}

func sanitizeJSONError(err error) string {
	msg := err.Error()
	if len(msg) > 120 {
		return msg[:120]
	}
	return msg
}
