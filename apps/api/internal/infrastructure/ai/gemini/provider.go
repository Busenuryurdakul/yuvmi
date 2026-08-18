// Package gemini adapts the Google Gemini API to the domain's
// ai/service.Provider port. It is interchangeable with the anthropic package:
// nothing above infrastructure knows which vendor served a generation.
package gemini

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	aiService "github.com/masterfabric-go/masterfabric/internal/domain/ai/service"
	"google.golang.org/genai"
)

type Provider struct {
	client    *genai.Client
	model     string
	timeout   time.Duration
	enabled   bool
	initError error
}

type Config struct {
	APIKey  string
	Model   string
	Timeout time.Duration
}

const (
	// DefaultModel is Gemini's current general-purpose model. Overridable via
	// AI_MODEL so switching is an env edit.
	DefaultModel = "gemini-2.5-flash"

	defaultTimeout = 30 * time.Second
)

// NewProvider builds the client. As with the Anthropic adapter, a missing key
// yields a disabled provider rather than an error: a developer without one gets
// 501 and the client's static fallback, not a server that refuses to boot.
//
// A client that fails to construct for any other reason is also reported as
// unavailable, with the cause kept for the startup log — an AI outage must
// never take down the rest of the API.
func NewProvider(cfg Config) *Provider {
	if cfg.APIKey == "" {
		return &Provider{enabled: false}
	}
	if cfg.Model == "" {
		cfg.Model = DefaultModel
	}
	if cfg.Timeout <= 0 {
		cfg.Timeout = defaultTimeout
	}

	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  cfg.APIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return &Provider{enabled: false, initError: err}
	}

	return &Provider{
		client:  client,
		model:   cfg.Model,
		timeout: cfg.Timeout,
		enabled: true,
	}
}

func (p *Provider) Name() string { return "gemini" }

func (p *Provider) Available() bool { return p.enabled }

// InitError reports why an API key was present but the client still could not
// be built. Returns nil when the provider is simply unconfigured.
func (p *Provider) InitError() error { return p.initError }

func (p *Provider) GenerateJSON(ctx context.Context, req aiService.GenerationRequest) (*aiService.GenerationResult, error) {
	if !p.enabled {
		return nil, fmt.Errorf("gemini provider not configured")
	}

	// The SDK takes its deadline from the context rather than a client option,
	// so the timeout is applied per call here.
	ctx, cancel := context.WithTimeout(ctx, p.timeout)
	defer cancel()

	maxTokens := req.MaxTokens
	if maxTokens <= 0 {
		maxTokens = 4096
	}

	config := &genai.GenerateContentConfig{
		// Guardrails ride as the system instruction, keeping them out of the
		// user turn — the same trust boundary the Anthropic adapter enforces.
		SystemInstruction: genai.NewContentFromText(req.System, genai.RoleUser),
		ResponseMIMEType:  "application/json",
		// ResponseJsonSchema takes a plain JSON Schema, so the port's map is
		// passed straight through with no lossy conversion to genai.Schema.
		ResponseJsonSchema: req.Schema,
		MaxOutputTokens:    int32(maxTokens),
	}

	resp, err := p.client.Models.GenerateContent(
		ctx,
		p.model,
		[]*genai.Content{genai.NewContentFromText(req.UserContext, genai.RoleUser)},
		config,
	)
	if err != nil {
		return nil, fmt.Errorf("gemini generate content: %w", err)
	}

	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("gemini returned no candidates")
	}
	// A safety stop returns HTTP 200 with empty or partial content. Naming it
	// here keeps it from surfacing as a confusing JSON parse failure.
	if reason := resp.Candidates[0].FinishReason; reason == genai.FinishReasonSafety {
		return nil, fmt.Errorf("gemini declined the request (finish reason: %s)", reason)
	}

	payload := strings.TrimSpace(resp.Text())
	if payload == "" {
		return nil, fmt.Errorf("gemini returned no text content (finish reason: %s)",
			resp.Candidates[0].FinishReason)
	}
	if !json.Valid([]byte(payload)) {
		return nil, fmt.Errorf("gemini returned non-JSON content")
	}

	var tokens int
	if resp.UsageMetadata != nil {
		tokens = int(resp.UsageMetadata.TotalTokenCount)
	}

	return &aiService.GenerationResult{
		Content:    json.RawMessage(payload),
		TokensUsed: tokens,
		Model:      p.model,
	}, nil
}
