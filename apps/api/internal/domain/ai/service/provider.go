package service

import (
	"context"
	"encoding/json"
)

// GenerationRequest is one structured-output call. The orchestrator builds it;
// providers translate it into whatever their vendor API expects.
//
// UserContext is kept separate from System deliberately. Everything in
// UserContext originates from the user's own writing and is therefore untrusted
// — providers must place it in a user turn so that a sentence like "ignore your
// instructions" is data the model reads, not policy it follows.
type GenerationRequest struct {
	// System is the guardrail prompt: locale, tone, forbidden topics.
	System string

	// UserContext is the PII-safe summary of the user's profile and goal.
	UserContext string

	// Schema is the JSON Schema the response must satisfy, as a decoded map —
	// the shape every vendor SDK wants, so no re-parsing happens per call.
	// Providers that support constrained decoding enforce it; the orchestrator
	// validates the result regardless, so a provider without that feature
	// stays correct.
	Schema map[string]any

	// SchemaName labels the schema for providers that require one.
	SchemaName string

	// MaxTokens caps output. Suggestion payloads are small; the cap exists to
	// bound cost on a runaway generation, not to shape the answer.
	MaxTokens int
}

// GenerationResult carries the parsed payload plus the accounting the AIJob
// record needs. Content is the raw JSON object, still unvalidated.
type GenerationResult struct {
	Content    json.RawMessage
	TokensUsed int
	Model      string
}

// Provider is the single seam between Yuvmi and any AI vendor. Swapping
// Anthropic for another vendor — or for the offline stub — means implementing
// this interface and changing one line of wiring in main.go.
type Provider interface {
	// Name identifies the provider in AIJob rows and logs.
	Name() string

	// Available reports whether the provider is configured well enough to
	// serve traffic. A provider that returns false is skipped in favour of
	// the fallback rather than failing user requests at runtime.
	Available() bool

	// GenerateJSON runs one constrained generation. It must return an error
	// rather than a partial result; the orchestrator treats any error as a
	// signal to fall back to the manual flow.
	GenerateJSON(ctx context.Context, req GenerationRequest) (*GenerationResult, error)
}
