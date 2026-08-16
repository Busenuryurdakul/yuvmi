package decoder_test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/decoder"
	"github.com/masterfabric-go/masterfabric/internal/application/waitlist/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func decodeBody(body string) error {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	_, err := decoder.DecodeSignupRequest(req)
	return err
}

func TestDecodeSignupRequest_Valid(t *testing.T) {
	req := httptest.NewRequest("POST", "/api/v1/public/waitlist", strings.NewReader(`{"email":"  User@Example.COM  ","consent":true}`))
	req.Header.Set("Content-Type", "application/json")

	got, err := decoder.DecodeSignupRequest(req)
	require.NoError(t, err)
	assert.Equal(t, "user@example.com", got.Email)
	assert.True(t, got.Consent)
}

func TestDecodeSignupRequest_EmptyBody(t *testing.T) {
	err := decodeBody("")
	require.Error(t, err)
}

func TestDecodeSignupRequest_UnknownField(t *testing.T) {
	err := decodeBody(`{"email":"user@example.com","consent":true,"foo":"bar"}`)
	require.Error(t, err)
}

func TestDecodeSignupRequest_TrailingJSON(t *testing.T) {
	err := decodeBody(`{"email":"user@example.com","consent":true}{"extra":true}`)
	require.Error(t, err)
}

func TestDecodeSignupRequest_ConsentMustBeTrue(t *testing.T) {
	err := decodeBody(`{"email":"user@example.com","consent":false}`)
	require.Error(t, err)
}

func TestDecodeSignupRequest_EmptyEmail(t *testing.T) {
	err := decodeBody(`{"email":"   ","consent":true}`)
	require.Error(t, err)
}

func TestDecodeSignupRequest_EmailTooLong(t *testing.T) {
	local := strings.Repeat("a", 309) + "@example.com"
	require.Greater(t, len(local), dto.SignupMaxEmailLength)
	err := decodeBody(`{"email":"` + local + `","consent":true}`)
	require.Error(t, err)
}

func TestDecodeSignupRequest_InvalidEmail(t *testing.T) {
	err := decodeBody(`{"email":"not-valid","consent":true}`)
	require.Error(t, err)
}
