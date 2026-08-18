package main

import (
	"io"
	"log/slog"
	"testing"

	"github.com/masterfabric-go/masterfabric/internal/shared/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func quietLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

// A typo in AI_PROVIDER must stop the server rather than quietly serving the
// default vendor — that would bill the wrong account while looking healthy.
func TestNewAIProvider_UnknownNameIsStartupError(t *testing.T) {
	_, err := newAIProvider(config.AIConfig{Provider: "gpt4"}, quietLogger())

	require.Error(t, err)
	assert.Contains(t, err.Error(), "gpt4", "the error must name the offending value")
}

func TestNewAIProvider_SelectsNamedVendor(t *testing.T) {
	for _, tc := range []struct {
		provider string
		want     string
	}{
		{"anthropic", "anthropic"},
		{"gemini", "gemini"},
		{"openai", "openai"},
		{"Gemini", "gemini"},     // case is not the user's problem
		{"  openai  ", "openai"}, // nor is stray whitespace from an env file
		{"", "anthropic"},        // unset keeps the historical default
	} {
		t.Run(tc.provider, func(t *testing.T) {
			p, err := newAIProvider(config.AIConfig{Provider: tc.provider}, quietLogger())

			require.NoError(t, err)
			assert.Equal(t, tc.want, p.Name())
		})
	}
}

// No key is a normal state, not a failure: the endpoints answer 501 and clients
// fall back to their static lists, so the server must still start.
func TestNewAIProvider_MissingKeyStartsUnavailable(t *testing.T) {
	for _, provider := range []string{"anthropic", "gemini", "openai"} {
		t.Run(provider, func(t *testing.T) {
			p, err := newAIProvider(config.AIConfig{Provider: provider}, quietLogger())

			require.NoError(t, err)
			assert.False(t, p.Available(),
				"a provider with no API key must report itself unavailable")
		})
	}
}
